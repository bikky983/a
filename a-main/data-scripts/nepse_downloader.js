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

// Function to download the CSV file
async function downloadNepseData() {
  console.log('Starting download process...');
  const todayDate = formatDate(new Date());
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false, // Change to true in production
    defaultViewport: null
  });
  
  try {
    // Open page
    const page = await browser.newPage();
    
    // Set download behavior to save in data-scripts folder
    const downloadPath = path.resolve('./a-main/data-scripts'); // Updated path
    
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadPath
    });
    
    // Navigate to website
    console.log('Navigating to website...');
    await page.goto('https://nepalstock.com.np/today-price', { waitUntil: 'networkidle2' });
    
    // Enter date
    console.log(`Setting date to ${todayDate}...`);
    await page.waitForXPath('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div/div/div/input');
    const dateInput = await page.$x('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div/div/div/input');
    await dateInput[0].click({ clickCount: 3 }); // Triple click to select all text
    await dateInput[0].type(todayDate);
    
    // Wait 2 seconds before clicking filter
    await page.waitForTimeout(2000);
    
    // Click filter button
    console.log('Clicking filter button...');
    await page.waitForXPath('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div/div[4]/button');
    const filterButton = await page.$x('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div/div[4]/button');
    await filterButton[0].click();
    
    // Wait 5 seconds before clicking download
    await page.waitForTimeout(5000);
    
    // Click download as CSV
    console.log('Clicking download as CSV...');
    await page.waitForXPath('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div[2]/a');
    const downloadButton = await page.$x('/html/body/app-root/div/main/div/app-today-price/div/div[2]/div[2]/a');
    await downloadButton[0].click();
    
    // Wait for download to complete (approximate)
    await page.waitForTimeout(5000);
    
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
  } finally {
    // Close browser
    await browser.close();
  }
}

// Function to schedule the task at 3:10 PM Nepal time every day
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

// If run directly, execute the download immediately
if (require.main === module) {
  // Check if test mode or scheduled mode
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