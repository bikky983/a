/**
 * State Manager Utility
 * 
 * Handles reading and writing state for notification tracking
 */

const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Store the state in memory
let currentState = null;

/**
 * Initialize the state manager
 * Loads state from file if available
 */
async function initialize() {
    try {
        const stateFilePath = path.resolve(process.cwd(), config.storage.previousAlerts);
        
        // Create directory if it doesn't exist
        const dir = path.dirname(stateFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // Check if state file exists
        if (fs.existsSync(stateFilePath)) {
            // Read and parse state file
            const data = fs.readFileSync(stateFilePath, 'utf8');
            currentState = JSON.parse(data);
            console.log('State loaded from file');
        } else {
            // Initialize with empty state
            currentState = {
                lastUpdated: null,
                institutionalStocks: {},
                trendlineStocks: {},
                rsiSupportStocks: {},
                heatmapStocks: {}
            };
            
            // Save initial state
            fs.writeFileSync(stateFilePath, JSON.stringify(currentState, null, 2));
            console.log('Created initial state file');
        }
    } catch (error) {
        console.error('Error initializing state:', error);
        
        // Fallback to empty state
        currentState = {
            lastUpdated: null,
            institutionalStocks: {},
            trendlineStocks: {},
            rsiSupportStocks: {},
            heatmapStocks: {}
        };
    }
}

/**
 * Get the current state
 * @returns {Object} Current state object
 */
async function getState() {
    if (!currentState) {
        await initialize();
    }
    
    return currentState;
}

/**
 * Update a specific part of the state
 * @param {string} key - The key to update ('institutionalStocks', 'trendlineStocks', etc.)
 * @param {Object} data - The data to store
 */
async function updateState(key, data) {
    if (!currentState) {
        await initialize();
    }
    
    // Update the specific section
    currentState[key] = data;
    
    // Update last updated timestamp
    currentState.lastUpdated = new Date().toISOString();
    
    try {
        // Save updated state to file
        const stateFilePath = path.resolve(process.cwd(), config.storage.previousAlerts);
        fs.writeFileSync(stateFilePath, JSON.stringify(currentState, null, 2));
        console.log(`State updated for ${key}`);
    } catch (error) {
        console.error('Error saving state:', error);
    }
}

module.exports = {
    initialize,
    getState,
    updateState
}; 