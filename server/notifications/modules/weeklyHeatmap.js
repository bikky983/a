/**
 * Weekly Heatmap Module
 * 
 * This module processes heatmap data to identify sector performance
 */

const config = require('../config/config');
const stateManager = require('../utils/stateManager');
const fs = require('fs');
const path = require('path');

// Store browser-collected data
let browserData = null;

// Mock sector data - in a real implementation, this would come from a data source
const mockSectorMapping = {
    // Banking
    'ADBL': 'Banking', 'NABIL': 'Banking', 'SCB': 'Banking', 'NCCB': 'Banking', 'SBI': 'Banking', 'BOKL': 'Banking',
    'NBB': 'Banking', 'NICA': 'Banking', 'MBL': 'Banking', 'LBL': 'Banking', 'KBL': 'Banking', 'EBL': 'Banking',
    'NIC': 'Banking', 'PCBL': 'Banking', 'SANIMA': 'Banking', 'NBL': 'Banking',
    
    // Insurance
    'NLIC': 'Insurance', 'NLICL': 'Insurance', 'RBCL': 'Insurance', 'NICL': 'Insurance', 'SICL': 'Insurance',
    'SLICL': 'Insurance', 'PRIN': 'Insurance', 'PICL': 'Insurance', 'NIL': 'Insurance', 
    
    // Hydropower
    'API': 'Hydropower', 'UPPER': 'Hydropower', 'CHCL': 'Hydropower', 'UMRH': 'Hydropower', 'UMHL': 'Hydropower',
    'AHPC': 'Hydropower', 'AKPL': 'Hydropower', 'BARUN': 'Hydropower', 'BPCL': 'Hydropower',
    
    // Manufacturing
    'UNL': 'Manufacturing', 'CIT': 'Manufacturing', 'HDL': 'Manufacturing', 'BNL': 'Manufacturing', 'SHIVM': 'Manufacturing',
    
    // Microfinance
    'GMFIL': 'Microfinance', 'MSLB': 'Microfinance', 'NMB': 'Microfinance', 'GBLBS': 'Microfinance',
    'GLBSL': 'Microfinance', 'DDBL': 'Microfinance', 'CBBL': 'Microfinance', 'LLBS': 'Microfinance',
    
    // Investment
    'NIFRA': 'Investment', 'HIDCL': 'Investment', 'CIT': 'Investment',
    
    // Life Insurance
    'NLIC': 'Life Insurance', 'LIC': 'Life Insurance', 'ALICL': 'Life Insurance',
    
    // Non-Life Insurance
    'RBCLPO': 'Non-Life Insurance', 'NIL': 'Non-Life Insurance', 'PICL': 'Non-Life Insurance'
};

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
        { symbol: 'ADBL', closePrice: '410', openPrice: '400', changePercent: '2.5%', volume: '500000', sector: 'Banking' },
        { symbol: 'NABIL', closePrice: '910', openPrice: '900', changePercent: '1.1%', volume: '300000', sector: 'Banking' },
        { symbol: 'NRIC', closePrice: '650', openPrice: '645', changePercent: '0.78%', volume: '250000', sector: 'Insurance' },
        { symbol: 'API', closePrice: '320', openPrice: '315', changePercent: '1.59%', volume: '400000', sector: 'Hydropower' },
        { symbol: 'UPPER', closePrice: '280', openPrice: '275', changePercent: '1.82%', volume: '350000', sector: 'Hydropower' }
    ];
}

/**
 * Assign sectors to stocks
 * @param {Array} stocks - Stock data to assign sectors to
 * @returns {Array} Stocks with sectors assigned
 */
function assignSectors(stocks) {
    return stocks.map(stock => {
        // Try to find sector from symbol
        const symbol = stock.symbol.replace(/\s+/g, '').split('\n')[0];
        const sector = mockSectorMapping[symbol] || stock.sector || 'Other';
        
        return {
            ...stock,
            sector
        };
    });
}

/**
 * Group stocks by their sectors
 * @param {Array} stocks - Stock data to be grouped
 * @returns {Object} Stocks grouped by sector
 */
function groupBySector(stocks) {
    const sectors = {};
    
    // First assign sectors if they don't have one
    const stocksWithSectors = assignSectors(stocks);
    
    // Group stocks by sector
    stocksWithSectors.forEach(stock => {
        // Determine sector - default to "Other" if unknown
        const sector = stock.sector || "Other";
        
        if (!sectors[sector]) {
            sectors[sector] = [];
        }
        
        sectors[sector].push(stock);
    });
    
    // Sort stocks within each sector by volume (highest to lowest)
    Object.keys(sectors).forEach(sector => {
        sectors[sector].sort((a, b) => {
            const volumeA = parseFloat(String(a.volume).replace(/,/g, ''));
            const volumeB = parseFloat(String(b.volume).replace(/,/g, ''));
            return volumeB - volumeA;
        });
    });
    
    return sectors;
}

/**
 * Process weekly heatmap data
 * @returns {Object} Processed heatmap data
 */
async function process() {
    try {
        console.log('Processing weekly heatmap data...');

        // Use browser data if available, otherwise use sample data
        const stockData = browserData || getSampleData();
        console.log(`Processing ${stockData.length} stocks for heatmap`);
        
        // Get previous state to mark new stocks
        const previousState = await stateManager.getState();
        const previousHeatmapStocks = previousState?.heatmapStocks || {};
        
        // Format data for notification
        const formattedData = stockData.map(stock => {
            const symbol = stock.symbol ? stock.symbol.replace(/\s+/g, '').split('\n')[0] : '';
            
            // Check if this is a new stock compared to previous state
            const newToSystem = !previousHeatmapStocks[symbol];
            
            return {
                symbol,
                closePrice: parseFloat(String(stock.closePrice || stock.price || 0).replace(/,/g, '')),
                openPrice: parseFloat(String(stock.openPrice || 0).replace(/,/g, '')),
                changePercent: stock.changePercent || '0%',
                volume: parseFloat(String(stock.volume || 0).replace(/,/g, '')),
                high: parseFloat(String(stock.high || 0).replace(/,/g, '')),
                low: parseFloat(String(stock.low || 0).replace(/,/g, '')),
                volatility: stock.volatility || 0,
                rsi: parseFloat(stock.rsi || 0),
                sector: stock.sector || mockSectorMapping[symbol] || 'Other',
                newToSystem
            };
        });
        
        // Group by sector
        const groupedData = groupBySector(formattedData);
        
        // Get top stocks by volume from each sector
        const topNByVolume = config.criteria.heatmap.topNbyVolume || 5;
        const minVolume = config.criteria.heatmap.minVolume || 100000;
        
        const topByVolume = {};
        
        Object.keys(groupedData).forEach(sector => {
            const sectorStocks = groupedData[sector];
            
            // Filter by minimum volume
            const highVolumeStocks = sectorStocks.filter(stock => 
                stock.volume >= minVolume);
            
            // Take top N from each sector
            if (highVolumeStocks.length > 0) {
                topByVolume[sector] = highVolumeStocks.slice(0, topNByVolume);
            }
        });
        
        // Update state
        const newHeatmapState = {};
        formattedData.forEach(stock => {
            if (stock.symbol) {
                newHeatmapState[stock.symbol] = {
                    price: stock.closePrice,
                    volume: stock.volume,
                    lastUpdated: new Date().toISOString()
                };
            }
        });
        
        // Save updated state
        await stateManager.updateState('heatmapStocks', newHeatmapState);
        
        return {
            type: 'weeklyHeatmap',
            data: {
                sectors: topByVolume
            }
        };
    } catch (error) {
        console.error('Error processing weekly heatmap data:', error);
        return {
            type: 'weeklyHeatmap',
            error: error.toString(),
            data: { sectors: { 'Other': [] } }
        };
    }
}

module.exports = {
    setBrowserData,
    getSampleData,
    process
}; 