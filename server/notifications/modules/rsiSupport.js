/**
 * RSI Support Module
 * 
 * This module processes stocks that are at RSI support levels
 */

const config = require('../config/config');
const path = require('path');
const stateManager = require('../utils/stateManager');

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
        { symbol: 'ADBL', ltp: '410', rsi: '35', supportPrice1: '400', diff1: '2.50%', isNew: true },
        { symbol: 'NABIL', ltp: '910', rsi: '32', supportPrice1: '900', diff1: '1.11%', isNew: false },
        { symbol: 'NRIC', ltp: '650', rsi: '29', supportPrice1: '645', diff1: '0.78%', isNew: false }
    ];
}

/**
 * Process RSI support stocks data
 * @returns {Object} Processed RSI support data
 */
async function process() {
    try {
        console.log('Processing RSI support data...');

        // Load previous state to compare for changes
        const previousState = await stateManager.getState();
        
        // Use browser data if available, otherwise use sample data
        const stockData = browserData || getSampleData();
        console.log(`Processing ${stockData.length} RSI support stocks`);
        
        // Format data for notification
        const formattedData = stockData.map(stock => {
            return {
                symbol: stock.symbol,
                ltp: parseFloat(stock.ltp.replace(/,/g, '')), // Remove commas if present
                rsi: parseFloat(stock.rsi),
                supportPrice1: parseFloat(stock.supportPrice1?.replace(/,/g, '') || 0),
                diff1: stock.diff1,
                supportPrice2: parseFloat(stock.supportPrice2?.replace(/,/g, '') || 0),
                diff2: stock.diff2,
                supportPrice3: parseFloat(stock.supportPrice3?.replace(/,/g, '') || 0),
                diff3: stock.diff3,
                isNew: !!stock.isNew
            };
        });
        
        // Compare with previous state to determine new stocks
        const previousRSIStocks = previousState?.rsiSupportStocks || {};
        
        formattedData.forEach(stock => {
            if (!previousRSIStocks[stock.symbol]) {
                stock.newToSystem = true;
            } else {
                stock.newToSystem = false;
            }
        });
        
        // Update state with new data
        const newRSIState = {};
        formattedData.forEach(stock => {
            newRSIState[stock.symbol] = {
                ltp: stock.ltp,
                rsi: stock.rsi,
                supportPrice1: stock.supportPrice1,
                diff1: stock.diff1,
                lastUpdated: new Date().toISOString()
            };
        });
        
        // Save updated state
        await stateManager.updateState('rsiSupportStocks', newRSIState);
        
        return {
            type: 'rsiSupport',
            data: {
                stocks: formattedData
            }
        };
    } catch (error) {
        console.error('Error processing RSI support data:', error);
        return {
            type: 'rsiSupport',
            error: error.toString(),
            data: { stocks: [] }
        };
    }
}

module.exports = {
    setBrowserData,
    getSampleData,
    process
}; 