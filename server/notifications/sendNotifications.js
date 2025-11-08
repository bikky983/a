/**
 * Main Notification Sender
 * This script processes all stock notifications and sends emails
 * Modified to work with browser-based data flow
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');
const puppeteer = require('puppeteer');
const emailUtil = require('./utils/emailUtil');
const stateManager = require('./utils/stateManager');
const config = require('./config/config');

// Try to load page settings if available
let pageSettings = {};
try {
    const settingsPath = path.resolve(process.cwd(), 'config/page-settings.json');
    if (fs.existsSync(settingsPath)) {
        pageSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        console.log('Loaded page settings for notification processing');
    }
} catch (error) {
    console.warn('Could not load page settings:', error.message);
}

// Export settings for other modules
module.exports = {
    pageSettings
};

// Import all notification modules
const institutionalActivity = require('./modules/institutionalActivity');
const trendlineScanner = require('./modules/trendlineScanner');
const weeklyHeatmap = require('./modules/weeklyHeatmap');
const rsiSupport = require('./modules/rsiSupport');

// Register additional Handlebars helpers for the email template
const handlebars = require('handlebars');
handlebars.registerHelper('gt', function(a, b) {
    return a > b;
});

handlebars.registerHelper('formatDate', function(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
});

handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
});

/**
 * Loads data from the website using headless browser
 * First loads dashboard and uploads Excel file, then visits each analysis page
 * 
 * This function has been modified to work with the enhanced GitHub workflow,
 * which now runs a separate automation script first and saves results to file
 */
async function loadDataViaBrowser() {
    console.log('Starting browser-based data loading...');
    
    // Store data from each page
    const dataStore = {};
    
    try {
        // Check if the main collection file exists with all data
        const allDataPath = path.join(process.cwd(), 'all-stocks-data.json');
        if (fs.existsSync(allDataPath)) {
            console.log('Found pre-collected stock data file');
            // Load the all data that was collected by the GitHub workflow
            const allData = JSON.parse(fs.readFileSync(allDataPath, 'utf-8'));
            
            // Copy all collected data to our dataStore
            if (allData.rsiSupport && allData.rsiSupport.length > 0) {
                dataStore.rsiSupport = allData.rsiSupport;
                console.log(`Loaded ${allData.rsiSupport.length} RSI Support stocks`);
            }
            
            if (allData.trendlineScanner && allData.trendlineScanner.length > 0) {
                dataStore.trendlineScanner = allData.trendlineScanner;
                console.log(`Loaded ${allData.trendlineScanner.length} Trendline Scanner stocks`);
            }
            
            if (allData.institutionalActivity && allData.institutionalActivity.length > 0) {
                dataStore.heatmap = allData.institutionalActivity; // Use heatmap key for institutional activity
                console.log(`Loaded ${allData.institutionalActivity.length} Institutional Activity stocks`);
            }
            
            if (allData.heatmap && allData.heatmap.length > 0) {
                dataStore.weeklyHeatmap = allData.heatmap; // Use weeklyHeatmap key for heatmap
                console.log(`Loaded ${allData.heatmap.length} Heatmap stocks`);
            }
            
            // If we found the main file, use the loaded data without running browser automation
            return dataStore;
        }
        
        // Check for individual files if the combined file doesn't exist
        const fileChecks = [
            { 
                path: path.join(process.cwd(), 'rsiSupport-stocks.json'),
                key: 'rsiSupport'
            },
            { 
                path: path.join(process.cwd(), 'trendlineScanner-stocks.json'),
                key: 'trendlineScanner'
            },
            { 
                path: path.join(process.cwd(), 'institutionalActivity-stocks.json'),
                storeKey: 'heatmap' 
            },
            { 
                path: path.join(process.cwd(), 'heatmap-stocks.json'),
                storeKey: 'weeklyHeatmap' 
            }
        ];
        
        let foundAnyFiles = false;
        for (const check of fileChecks) {
            if (fs.existsSync(check.path)) {
                foundAnyFiles = true;
                const data = JSON.parse(fs.readFileSync(check.path, 'utf-8'));
                dataStore[check.storeKey || check.key] = data;
                console.log(`Loaded ${data.length} ${check.key} stocks from individual file`);
            }
        }
        
        if (foundAnyFiles) {
            return dataStore;
        }
        
        // If we don't have pre-collected data, fall back to regular browser automation
        console.log('No pre-collected data found, running full browser automation');
        
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Determine the base URL - use localhost:3000 if running in GitHub workflow
        const isGithubAction = process.env.GITHUB_ACTIONS === 'true';
        const baseUrl = isGithubAction 
            ? 'http://localhost:3000' 
            : 'https://jhingalala.netlify.app';
        
        // First visit dashboard to initialize local storage
        console.log('Loading dashboard...');
        await page.goto(`${baseUrl}/dashboard.html`, { 
            waitUntil: 'networkidle0',
            timeout: 60000 
        });
        
        // Upload Excel file
        try {
            console.log('Uploading Excel file...');
            
            // Look for the file input element
            const uploadButton = await page.$('#uploadExcel');
            
            if (uploadButton) {
                // Set the file to upload
                const excelFilePath = path.join(__dirname, '../../public/stocks.xlsx');
                
                // Upload the file
                await uploadButton.uploadFile(excelFilePath);
                
                // Wait for the file to be processed
                await page.waitForTimeout(3000);
                
                console.log('Excel file uploaded successfully');
            } else {
                console.log('Upload button not found, checking for alternative upload method');
                
                // Try alternative methods to upload
                const fileInputs = await page.$$('input[type="file"]');
                if (fileInputs.length > 0) {
                    const excelFilePath = path.join(__dirname, '../../public/stocks.xlsx');
                    await fileInputs[0].uploadFile(excelFilePath);
                    await page.waitForTimeout(3000);
                    console.log('Excel file uploaded via alternative method');
                } else {
                    console.log('No file input elements found');
                }
            }
        } catch (uploadError) {
            console.error('Error uploading Excel file:', uploadError);
        }
        
        // Wait for local storage to be populated
        await page.waitForTimeout(2000);
        
        // Visit each analysis page and extract data
        const pagesToVisit = [
            { url: `${baseUrl}/rsi-support.html`, key: 'rsiSupport' },
            { url: `${baseUrl}/heatmap.html`, key: 'heatmap' },
            { url: `${baseUrl}/enhanced-trendline-scanner.html`, key: 'trendlineScanner' }
        ];
        
        // Prioritize RSI-support page first since that's what we're most interested in
        for (const pageInfo of pagesToVisit) {
            console.log(`Loading ${pageInfo.key} page...`);
            await page.goto(pageInfo.url, { waitUntil: 'networkidle0', timeout: 60000 });
            
            // Allow time for page to process data
            await page.waitForTimeout(5000);
            
            // Extract data from tables
            dataStore[pageInfo.key] = await page.evaluate(() => {
                const tableData = [];
                const tables = document.querySelectorAll('table');
                
                if (tables.length > 0) {
                    // Use first table found
                    const rows = tables[0].querySelectorAll('tr');
                    
                    // Get headers first to use as keys
                    const headers = [];
                    const headerCells = rows[0]?.querySelectorAll('th');
                    if (headerCells) {
                        headerCells.forEach(cell => {
                            headers.push(cell.textContent.trim().toLowerCase().replace(/\s+/g, '_'));
                        });
                    }
                    
                    // Process data rows
                    for (let i = 1; i < rows.length; i++) {
                        const cells = rows[i].querySelectorAll('td');
                        if (cells.length > 0) {
                            const rowData = {};
                            
                            // Use headers if available, otherwise use generic column names
                            for (let j = 0; j < cells.length; j++) {
                                const key = headers[j] || `col${j}`;
                                rowData[key] = cells[j].textContent.trim();
                            }
                            
                            tableData.push(rowData);
                        }
                    }
                }
                
                return tableData;
            });
            
            console.log(`Retrieved ${dataStore[pageInfo.key].length} rows from ${pageInfo.key}`);
        }
        
        await browser.close();
        console.log('Data collection complete');
        
        return dataStore;
    } catch (error) {
        console.error('Error in browser data collection:', error);
        return null;
    }
}

/**
 * Process all notification types and send combined email
 */
async function processAndSendNotifications() {
    try {
        console.log('Starting notification process...');
        
        // Initialize state manager
        await stateManager.initialize();
        
        // Load data via browser automation
        const browserData = await loadDataViaBrowser();
        
        // Process each type of notification
        const results = {
            timestamp: new Date().toISOString()
        };
        
        // Helper to process module with real or sample data
        const processModule = async (name, module, browserDataKey) => {
            try {
                console.log(`Processing ${name} notifications...`);
                
                // If we have browser data for this module, use it
                if (browserData && browserData[browserDataKey] && browserData[browserDataKey].length > 0) {
                    console.log(`Using browser data for ${name}`);
                    // Set the browser data for the module to use
                    module.setBrowserData(browserData[browserDataKey]);
                }
                
                return await module.process();
            } catch (error) {
                console.error(`Error processing ${name}:`, error);
                console.log(`Using sample data for ${name} due to error`);
                // For modules with getSampleData method, use that as fallback
                if (typeof module.getSampleData === 'function') {
                    const sampleData = module.getSampleData();
                    return {
                        type: name,
                        data: name === 'institutionalActivity' ? 
                              { '0.5': sampleData.filter(s => s.score >= 0.5 && s.score < 0.65),
                                '0.65': sampleData.filter(s => s.score >= 0.65 && s.score < 0.8),
                                '0.8': sampleData.filter(s => s.score >= 0.8) } :
                              name === 'trendlineScanner' ?
                              { new: sampleData.filter(s => s.trend === 'Uptrend').slice(0, 2),
                                existing: sampleData.filter(s => s.trend === 'Uptrend').slice(2) } :
                              name === 'weeklyHeatmap' ?
                              { sectors: Object.values(sampleData).reduce((acc, stocks) => {
                                  const sector = stocks[0]?.sector || 'Unknown';
                                  acc[sector] = stocks.slice(0, 3);
                                  return acc;
                                }, {}) } :
                              { stocks: sampleData }
                    };
                }
                return null;
            }
        };
        
        // Add institutional activity notifications
        results.institutionalActivity = await processModule('institutionalActivity', institutionalActivity, 'heatmap');
        
        // Add trendline scanner notifications
        results.trendlineScanner = await processModule('trendlineScanner', trendlineScanner, 'trendlineScanner');
        
        // Add weekly heatmap notifications
        results.weeklyHeatmap = await processModule('weeklyHeatmap', weeklyHeatmap, 'heatmap');
        
        // Add RSI support notifications
        results.rsiSupport = await processModule('rsiSupport', rsiSupport, 'rsiSupport');
        if (results.rsiSupport) {
            results.rsiSupport.maxRSI = config.criteria.rsiSupport.maxRSI;
        }
        
        // Check if we have any notifications to send
        const hasNotifications = 
            results.institutionalActivity?.data || 
            results.trendlineScanner?.data || 
            results.weeklyHeatmap?.data || 
            results.rsiSupport?.data;
        
        if (!hasNotifications) {
            console.log('No notifications to send.');
            return;
        }
        
        // Send the email notification
        try {
            await emailUtil.sendStockNotification(results);
            console.log('Notifications sent successfully.');
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            console.log('Email notification data:', JSON.stringify(results, null, 2));
        }
        
    } catch (error) {
        console.error('Error in notification process:', error);
    }
}

/**
 * Schedule notifications based on cron pattern
 */
function scheduleNotifications() {
    const cronPattern = config.schedule.notificationCron;
    console.log(`Scheduling notifications with pattern: ${cronPattern}`);
    
    schedule.scheduleJob(cronPattern, async () => {
        await processAndSendNotifications();
    });
    
    console.log('Notifications scheduled.');
}

/**
 * Main execution
 */
async function main() {
    // Check if we're running from command line
    const runImmediately = process.argv.includes('--now');
    
    if (runImmediately) {
        console.log('Running notifications immediately...');
        await processAndSendNotifications();
    } else {
        scheduleNotifications();
    }
}

// Run the main function
main().catch(err => {
    console.error('Fatal error in notification system:', err);
    process.exit(1);
}); 