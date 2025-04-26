// API Service for the NEPSE Stock Screener
// This file handles all API calls to the serverless functions

class ApiService {
    constructor() {
        // Base URL for API calls - for local development, use '/api'
        // For production (Netlify), the redirects in netlify.toml will handle this
        this.baseUrl = '/api';
    }

    // Fetch all available stocks
    async fetchStocks() {
        try {
            const response = await fetch(`${this.baseUrl}/stocks`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching stocks:', error);
            throw error;
        }
    }

    // Fetch current stock prices
    async fetchPrices() {
        try {
            const response = await fetch(`${this.baseUrl}/prices`);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching prices:', error);
            throw error;
        }
    }
}

// Create and export a single instance
const apiService = new ApiService(); 