/**
 * Email Utility
 * 
 * Handles sending notification emails
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');
const config = require('../config/config');

// Register custom Handlebars helpers
handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
});

// Register comparison helper
handlebars.registerHelper('gt', function(a, b) {
    return a > b;
});

// Register helper to access object properties with dots in them
handlebars.registerHelper('prop', function(obj, prop) {
    return obj[prop];
});

// Register a helper to format dates
handlebars.registerHelper('formatDate', function(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
});

// Register current year helper
handlebars.registerHelper('currentYear', function() {
    return new Date().getFullYear();
});

/**
 * Create email transporter
 * @returns {object} Nodemailer transporter
 */
function createTransporter() {
    // Get email configuration
    const emailConfig = config.email;
    
    // Create a transporter based on the configuration
    return nodemailer.createTransport({
        service: emailConfig.service,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
}

/**
 * Load and compile an email template
 * @param {string} templateName - Name of the template file without extension
 * @returns {Function} Compiled Handlebars template
 */
function loadTemplate(templateName) {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    return handlebars.compile(templateSource);
}

/**
 * Get available screenshot attachments
 * @returns {Array} Array of screenshot attachment objects
 */
function getScreenshotAttachments() {
    const screenshots = [
        { filename: 'dashboard-loaded.png', path: 'dashboard-loaded.png', cid: 'dashboard-loaded' },
        { filename: 'rsi-page-loaded.png', path: 'rsi-page-loaded.png', cid: 'rsi-page-loaded' },
        { filename: 'trendline-page-loaded.png', path: 'trendline-page-loaded.png', cid: 'trendline-page-loaded' },
        { filename: 'institutional-page-loaded.png', path: 'institutional-page-loaded.png', cid: 'institutional-page-loaded' },
        { filename: 'heatmap-page-loaded.png', path: 'heatmap-page-loaded.png', cid: 'heatmap-page-loaded' }
    ];
    
    // Filter out non-existent files
    const existingScreenshots = screenshots.filter(screenshot => {
        const filepath = screenshot.path;
        const fullPath = path.resolve(filepath);
        
        // Check if the file exists
        try {
            fs.accessSync(fullPath, fs.constants.R_OK);
            screenshot.path = fullPath; // Use full path
            return true;
        } catch (error) {
            console.log(`Screenshot not found: ${filepath}`);
            return false;
        }
    });
    
    return existingScreenshots;
}

/**
 * Send a notification email
 * @param {string} subject - Email subject
 * @param {object} data - Data to be passed to the template
 * @returns {Promise} Promise that resolves when email is sent
 */
async function sendNotificationEmail(subject, data) {
    try {
        // Create mail transporter
        const transporter = createTransporter();
        
        // Load and compile the template
        const template = loadTemplate('stockAlert');
        
        // Generate HTML content
        const htmlContent = template(data);
        
        // Get recipients from config
        const recipients = config.email.recipients;
        
        if (!recipients || recipients.length === 0) {
            console.log('No recipients configured, skipping email send');
            return;
        }
        
        // Get screenshot attachments
        const attachments = getScreenshotAttachments();
        console.log(`Found ${attachments.length} screenshot(s) to attach to the email`);
        
        // Build email options
        const mailOptions = {
            from: config.email.from,
            to: recipients.join(', '),
            subject: config.email.subjectPrefix + subject,
            html: htmlContent,
            attachments: attachments
        };
        
        console.log(`Sending notification email to ${recipients.length} recipients`);
        
        // Send email
        const result = await transporter.sendMail(mailOptions);
        console.log(`Email sent: ${result.messageId}`);
        return result;
    } catch (error) {
        console.error('Error sending notification email:', error);
        throw error;
    }
}

/**
 * Send a stock notification email with structured data
 * @param {object} stockData - Processed stock data for the notification
 * @returns {Promise} Promise that resolves when email is sent
 */
async function sendStockNotification(stockData) {
    try {
        // Generate a subject based on the content
        const hasRSI = stockData.rsiSupport?.data?.stocks?.length > 0;
        const hasTrendline = stockData.trendlineScanner?.data?.new?.length > 0 || 
                         stockData.trendlineScanner?.data?.existing?.length > 0;
        const hasInstitutional = stockData.institutionalActivity?.data && 
                             Object.values(stockData.institutionalActivity.data)
                                 .some(arr => arr.length > 0);
                                 
        // Craft subject based on what we're notifying about
        let subject = 'Stock Analysis';
        if (hasRSI) {
            subject = `${stockData.rsiSupport.data.stocks.length} Stocks at Support`;
        } else if (hasTrendline) {
            const newCount = stockData.trendlineScanner.data.new?.length || 0;
            subject = `${newCount} New Uptrends Detected`;
        } else if (hasInstitutional) {
            subject = 'Institutional Activity Alert';
        }
        
        // Send the notification with the generated subject
        return await sendNotificationEmail(subject, stockData);
    } catch (error) {
        console.error('Error sending stock notification:', error);
        throw error;
    }
}

module.exports = {
    sendNotificationEmail,
    sendStockNotification
};