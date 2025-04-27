const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const stockScraper = require('./server/stockScraper');
const { scheduleAllTasks } = require('./data-scripts/scheduler');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize NEPSE data schedulers
console.log('Initializing NEPSE data schedulers...');
scheduleAllTasks();

// API Routes
app.get('/api/stocks', async (req, res) => {
    try {
        const data = await stockScraper.scrapeStockData();
        if (!data.success) {
            throw new Error(data.error);
        }
        res.json(data.stocks);
    } catch (error) {
        console.error('Error fetching stocks:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// Get current prices
app.get('/api/prices', async (req, res) => {
    try {
        const prices = await stockScraper.getStockPrices();
        res.json(prices);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch prices' });
    }
});

// Add endpoint to access NEPSE data
app.get('/api/nepse-data', (req, res) => {
    try {
        // First try to find the file in the public directory
        const publicDataPath = path.join(__dirname, 'public', 'organized_nepse_data.json');
        const dataScriptsPath = path.join(__dirname, 'data-scripts', 'organized_nepse_data.json');
        
        // Check if the file exists in the public directory first
        if (fs.existsSync(publicDataPath)) {
            console.log("Serving NEPSE data from public directory");
            const data = JSON.parse(fs.readFileSync(publicDataPath, 'utf8'));
            return res.json(data);
        } 
        // If not found in public, check in data-scripts (fallback)
        else if (fs.existsSync(dataScriptsPath)) {
            console.log("Serving NEPSE data from data-scripts directory (fallback)");
            const data = JSON.parse(fs.readFileSync(dataScriptsPath, 'utf8'));
            return res.json(data);
        } 
        // No file found in either location
        else {
            console.log("NEPSE data file not found in either location");
            return res.status(404).json({ error: 'NEPSE data not found' });
        }
    } catch (error) {
        console.error('Error reading NEPSE data:', error);
        res.status(500).json({ error: 'Failed to fetch NEPSE data' });
    }
});

// Direct access to NEPSE data from public folder
// This will be accessible via http://localhost:3000/organized_nepse_data.json
console.log("NEPSE data also directly accessible via /organized_nepse_data.json");

// Page Routes
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/dashboard.html');
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
