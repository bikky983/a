/**
 * Trendline Scanner Module
 * 
 * This module processes enhanced trendline scanner data
 */

const config = require('../config/config');
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
        { 
            symbol: 'ADBL', 
            quality: 'Strong', 
            direction: 'Uptrend', 
            currentPrice: '410',
            trendlinePrice: '390', 
            distancePercent: '5.1%', 
            touches: '4',
            duration: '20',
            isNew: true 
        },
        { 
            symbol: 'NABIL', 
            quality: 'Medium', 
            direction: 'Uptrend', 
            currentPrice: '910',
            trendlinePrice: '890', 
            distancePercent: '2.2%', 
            touches: '3',
            duration: '15',
            isNew: false 
        },
        { 
            symbol: 'NRIC', 
            quality: 'Strong', 
            direction: 'Uptrend', 
            currentPrice: '650',
            trendlinePrice: '640', 
            distancePercent: '1.6%', 
            touches: '5',
            duration: '30',
            isNew: false 
        }
    ];
}

/**
 * Process trendline scanner data
 * @returns {Object} Processed trendline data
 */
async function process() {
    try {
        console.log('Processing trendline scanner data...');

        // Load previous state to compare for changes
        const previousState = await stateManager.getState();
        
        // Use browser data if available, otherwise use sample data
        const stockData = browserData || getSampleData();
        console.log(`Processing ${stockData.length} stocks from trendline scanner`);
        
        // Format data for notification
        const formattedData = stockData.map(stock => {
            return {
                symbol: stock.symbol,
                quality: stock.quality || 'Medium',
                direction: stock.direction || 'Uptrend',
                currentPrice: parseFloat(String(stock.currentPrice).replace(/,/g, '')),
                trendlinePrice: parseFloat(String(stock.trendlinePrice).replace(/,/g, '')),
                distancePercent: stock.distancePercent,
                touches: parseInt(stock.touches || '0'),
                duration: parseInt(stock.duration || '0'),
                isNew: !!stock.isNew
            };
        });
        
        // Compare with previous state to determine new stocks
        const previousTrendlineStocks = previousState?.trendlineStocks || {};
        
        // Filter for uptrends only with minimum percent change
        const minPercentChange = config.criteria.trendline.minPercentChange || 2.0;
        const periodToCheck = config.criteria.trendline.periodToCheck || 7; // days to check for new vs existing
        
        // Filter stocks with uptrend direction
        const uptrendStocks = formattedData.filter(stock => {
            // Check if the stock has an uptrend direction
            return (
                stock.direction.toLowerCase().includes('up') && 
                parseFloat(String(stock.distancePercent).replace(/[^0-9\.]/g, '')) >= minPercentChange
            );
        });
        
        // Separate new uptrends (within the periodToCheck) from existing ones
        const newUptrendStocks = [];
        const existingUptrendStocks = [];
        
        uptrendStocks.forEach(stock => {
            // If the stock wasn't in previous state or was added recently as new, it's a new uptrend
            if (!previousTrendlineStocks[stock.symbol] || stock.isNew) {
                // Add a flag to identify it as new to the system
                stock.newToSystem = !previousTrendlineStocks[stock.symbol];
                newUptrendStocks.push(stock);
            } else {
                // It's an existing uptrend
                stock.newToSystem = false;
                existingUptrendStocks.push(stock);
            }
        });
        
        // Update state with new data
        const newTrendlineState = {};
        uptrendStocks.forEach(stock => {
            newTrendlineState[stock.symbol] = {
                direction: stock.direction,
                price: stock.currentPrice,
                trendlinePrice: stock.trendlinePrice,
                quality: stock.quality,
                duration: stock.duration,
                lastUpdated: new Date().toISOString()
            };
        });
        
        // Save updated state
        await stateManager.updateState('trendlineStocks', newTrendlineState);
        
        return {
            type: 'trendlineScanner',
            data: {
                new: newUptrendStocks,
                existing: existingUptrendStocks
            }
        };
    } catch (error) {
        console.error('Error processing trendline scanner data:', error);
        return {
            type: 'trendlineScanner',
            error: error.toString(),
            data: { new: [], existing: [] }
        };
    }
}

module.exports = {
    setBrowserData,
    getSampleData,
    process
}; 