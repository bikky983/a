const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const schedule = require('node-schedule');

// Function to format date as mm/dd/yyyy
function formatDate(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

async function downloadNepseData() {
  console.log('Starting download process...');
  const todayDate = formatDate(new Date());
  
  // Launch browser with headless mode for CI environment
  const browser = await puppeteer.launch({
    headless: 'new',  // Use new headless mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
    ],
    defaultViewport: { width: 1920, height: 1080 }
  });
  
  try {
    // Open page
    const page = await browser.newPage();
    
    // Set download behavior
    const downloadPath = path.resolve('./data-scripts');
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Navigate to website
    console.log('Navigating to website...');
    await page.goto('https://nepalstock.com.np/today-price', { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for 5 seconds for page to load properly
    console.log('Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Enter date
    console.log(`Setting date to ${todayDate}...`);
    const dateInput = await page.$('input.ng-untouched.ng-pristine.ng-valid[type="text"]');
    if (!dateInput) {
      throw new Error('Could not find date input element');
    }
    
    await dateInput.click({ clickCount: 3 });
    await dateInput.type(todayDate);
    
    // Wait 2 seconds before clicking filter
    console.log('Waiting before clicking filter...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Click filter button
    console.log('Clicking filter button...');
    const filterButton = await page.$('button.box__filter--search[type="button"]');
    if (!filterButton) {
      throw new Error('Could not find filter button');
    }
    await filterButton.click();
    
    // Wait 5 seconds before clicking download
    console.log('Waiting before downloading...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Click download as CSV
    console.log('Clicking download as CSV...');
    const downloadButton = await page.$('a.table__file');
    if (!downloadButton) {
      throw new Error('Could not find download button');
    }
    await downloadButton.click();
    
    // Wait for download to complete
    console.log('Waiting for download to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('Download completed successfully!');
    console.log(`CSV file should be saved in: ${downloadPath}`);
    
    // List files in the download directory to confirm
    try {
      const files = fs.readdirSync(downloadPath);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      console.log('CSV files in download directory:');
      csvFiles.forEach(file => console.log(` - ${file}`));
    } catch (err) {
      console.error('Error listing download directory:', err);
    }
    
  } catch (error) {
    console.error('Error during download process:', error);
    process.exit(1); // Exit with error code for GitHub Actions
  } finally {
    // Close browser
    await browser.close();
  }
}

// Function to schedule the downloader
function scheduleTask() {
  // Nepal is UTC+5:45
  const rule = new schedule.RecurrenceRule();
  rule.hour = 15; // 3 PM
  rule.minute = 10; // 10 minutes
  rule.tz = 'Asia/Kathmandu';
  
  console.log('Task scheduled to run at 3:10 PM Nepal time daily');
  
  schedule.scheduleJob(rule, function() {
    console.log(`Running scheduled task at ${new Date().toLocaleString()}`);
    downloadNepseData();
  });
}

// If run directly, execute the function based on arguments
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--now')) {
    downloadNepseData();
  } else {
    scheduleTask();
    console.log('Script is running in scheduled mode. Use --now flag to run immediately.');
  }
}

module.exports = {
  downloadNepseData,
  scheduleTask
}; 
