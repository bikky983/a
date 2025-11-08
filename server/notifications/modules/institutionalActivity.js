/**
 * Institutional Activity Module
 * 
 * This module processes institutional activity data
 */

const config = require('../config/config');
const stateManager = require('../utils/stateManager');
const fs = require('fs');
const path = require('path');

// Store browser-collected data
let browserData = null;

/**
 * Sets browser data for processing
 * @param {Array} data - The browser-collected data
 */
function setBrowserData(data) {
    browserData = data;
}

/**
 * Get sample data for testing
 * @returns {Array} Sample stock data
 */
function getSampleData() {
    return [
        { symbol: 'ADBL', score: '0.82', currentPrice: '410', patterns: 'Accumulation, High Volume' },
        { symbol: 'NABIL', score: '0.75', currentPrice: '910', patterns: 'Accumulation' },
        { symbol: 'NRIC', score: '0.60', currentPrice: '650', patterns: 'Distribution, Manipulation' },
        { symbol: 'PCBL', score: '0.45', currentPrice: '350', patterns: 'Normal Trading' }
    ];
}

/**
 * Process institutional activity data
 * @returns {Object} Processed institutional data by threshold
 */
async function process() {
    try {
        console.log('Processing institutional activity data...');

        // Load previous state to compare for changes
        const previousState = await stateManager.getState();
        
        // Use browser data if available, otherwise use sample data
        const stockData = browserData || getSampleData();
        console.log(`Processing ${stockData.length} stocks for institutional activity`);
        
        // Format data for notification
        const formattedData = stockData.map(stock => {
            let scoreValue = 0;
            
            // Parse score value - could be a number or a string with text
            if (typeof stock.score === 'string') {
                // Try to extract a numeric value from the score
                const match = stock.score.match(/([0-9]*[.])?[0-9]+/);
                if (match) {
                    scoreValue = parseFloat(match[0]);
                }
            } else if (typeof stock.score === 'number') {
                scoreValue = stock.score;
            }
            
            return {
                symbol: stock.symbol,
                score: scoreValue,
                currentPrice: parseFloat(String(stock.currentPrice).replace(/,/g, '')),
                patterns: stock.patterns || ''
            };
        });
        
        // Get institutional score thresholds - first try from page settings if available
        let pageSettingsFile = {};
        try {
            const settingsPath = path.resolve(process.cwd(), 'config/page-settings.json');
            if (fs.existsSync(settingsPath)) {
                pageSettingsFile = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
            }
        } catch (error) {
            console.warn('Could not load page settings for institutional activity:', error.message);
        }

        const thresholds = 
            (pageSettingsFile?.institutionalActivity?.thresholdLevels) || 
            config.criteria.institutionalActivity.thresholds || 
            [0.5, 0.65, 0.8];
        
        const minPercentChange = config.criteria.institutionalActivity.minPercentChange || 1.0;
        
        // Compare with previous state to determine changes
        const previousInstitutionalStocks = previousState?.institutionalStocks || {};
        
        formattedData.forEach(stock => {
            if (previousInstitutionalStocks[stock.symbol]) {
                const prevData = previousInstitutionalStocks[stock.symbol];
                
                // Calculate change from previous score
                if (prevData.score !== undefined) {
                    stock.prevScore = prevData.score;
                    stock.scoreChange = stock.score - prevData.score;
                }
                
                // Calculate price change if previous price available
                if (prevData.price !== undefined) {
                    stock.prevPrice = prevData.price;
                    stock.priceChange = ((stock.currentPrice - prevData.price) / prevData.price) * 100;
                }
                
                // Mark as new to system if not found previously
                stock.newToSystem = false;
            } else {
                stock.newToSystem = true;
            }
        });
        
        // Filter by minimum percent change if price history available
        const significantChangeStocks = formattedData.filter(stock => 
            !stock.priceChange || Math.abs(stock.priceChange) >= minPercentChange || stock.newToSystem
        );
        
        // Group by score thresholds
        const stocksByThreshold = {};
        
        // Initialize threshold groups
        thresholds.forEach(threshold => {
            stocksByThreshold[threshold] = [];
        });
        
        // Assign stocks to appropriate threshold buckets
        significantChangeStocks.forEach(stock => {
            // Find the highest threshold that this stock's score reaches
            for (let i = thresholds.length - 1; i >= 0; i--) {
                const threshold = thresholds[i];
                if (stock.score >= threshold) {
                    stocksByThreshold[threshold].push(stock);
                    break;
                }
            }
        });
        
        // Update state
        const newInstitutionalState = {};
        formattedData.forEach(stock => {
            newInstitutionalState[stock.symbol] = {
                score: stock.score,
                price: stock.currentPrice,
                patterns: stock.patterns,
                lastUpdated: new Date().toISOString()
            };
        });
        
        // Save updated state
        await stateManager.updateState('institutionalStocks', newInstitutionalState);
        
        return {
            type: 'institutionalActivity',
            data: stocksByThreshold
        };
    } catch (error) {
        console.error('Error processing institutional activity data:', error);
        return {
            type: 'institutionalActivity',
            error: error.toString(),
            data: { '0.5': [], '0.65': [], '0.8': [] }
        };
    }
}

module.exports = {
    setBrowserData,
    getSampleData,
    process
}; 