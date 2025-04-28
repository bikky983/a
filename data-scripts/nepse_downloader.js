const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

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
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null
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
  } finally {
    // Close browser
    await browser.close();
  }
}

// Run the download function
downloadNepseData(); 
