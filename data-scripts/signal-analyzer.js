/**
 * Signal Analyzer - Runs indicator on all stocks and generates signals
 */

const fs = require('fs');
const path = require('path');
const IndicatorEngine = require('./indicator-engine');

class SignalAnalyzer {
    constructor() {
        this.dataPath = path.join(__dirname, '../public/organized_nepse_data.json');
        this.signalsPath = path.join(__dirname, '../public/signals-database.json');
        this.indicator = new IndicatorEngine();
    }

    /**
     * Load stock data from organized_nepse_data.json
     */
    loadStockData() {
        console.log('Loading stock data...');
        try {
            const rawData = fs.readFileSync(this.dataPath, 'utf8');
            const allData = JSON.parse(rawData);
            
            // Group data by symbol
            const stocksMap = new Map();
            
            for (const entry of allData) {
                if (!entry.symbol) continue;
                
                if (!stocksMap.has(entry.symbol)) {
                    stocksMap.set(entry.symbol, []);
                }
                
                stocksMap.get(entry.symbol).push({
                    time: entry.time,
                    open: entry.open,
                    high: entry.high,
                    low: entry.low,
                    close: entry.close,
                    volume: entry.volume
                });
            }
            
            console.log(`Loaded data for ${stocksMap.size} stocks`);
            return stocksMap;
        } catch (error) {
            console.error('Error loading stock data:', error.message);
            return new Map();
        }
    }

    /**
     * Load existing signals database
     */
    loadSignalsDatabase() {
        try {
            if (fs.existsSync(this.signalsPath)) {
                const rawData = fs.readFileSync(this.signalsPath, 'utf8');
                return JSON.parse(rawData);
            }
        } catch (error) {
            console.error('Error loading signals database:', error.message);
        }
        
        // Return default structure
        return {
            lastUpdated: null,
            currentBuySignals: [],
            currentSellSignals: [],
            signalHistory: []
        };
    }

    /**
     * Save signals database
     */
    saveSignalsDatabase(database) {
        try {
            fs.writeFileSync(this.signalsPath, JSON.stringify(database, null, 2), 'utf8');
            console.log('Signals database saved successfully');
            return true;
        } catch (error) {
            console.error('Error saving signals database:', error.message);
            return false;
        }
    }

    /**
     * Analyze all stocks and generate signals
     */
    analyzeAllStocks() {
        console.log('Starting signal analysis...');
        const startTime = Date.now();
        
        const stocksMap = this.loadStockData();
        if (stocksMap.size === 0) {
            console.error('No stock data available');
            return;
        }

        const database = this.loadSignalsDatabase();
        const currentDate = new Date().toISOString().split('T')[0];
        
        const newBuySignals = [];
        const newSellSignals = [];
        const neutralStocks = [];
        
        let processedCount = 0;
        let errorCount = 0;

        // Analyze each stock
        for (const [symbol, data] of stocksMap.entries()) {
            try {
                const result = this.indicator.analyzeStock(data);
                
                if (result.signal === 'BUY') {
                    newBuySignals.push({
                        symbol,
                        signal: 'BUY',
                        date: result.date,
                        generatedOn: currentDate,
                        price: result.price,
                        details: result.details
                    });
                } else if (result.signal === 'SELL') {
                    newSellSignals.push({
                        symbol,
                        signal: 'SELL',
                        date: result.date,
                        generatedOn: currentDate,
                        price: result.price,
                        details: result.details
                    });
                } else if (result.signal === 'NEUTRAL') {
                    neutralStocks.push(symbol);
                }
                
                processedCount++;
                
                if (processedCount % 50 === 0) {
                    console.log(`Processed ${processedCount}/${stocksMap.size} stocks...`);
                }
            } catch (error) {
                console.error(`Error analyzing ${symbol}:`, error.message);
                errorCount++;
            }
        }

        // Update database
        database.lastUpdated = new Date().toISOString();
        database.currentBuySignals = newBuySignals;
        database.currentSellSignals = newSellSignals;

        // Add to history (keep last 30 days)
        database.signalHistory.push({
            date: currentDate,
            buyCount: newBuySignals.length,
            sellCount: newSellSignals.length,
            buySignals: newBuySignals.map(s => ({ symbol: s.symbol, price: s.price })),
            sellSignals: newSellSignals.map(s => ({ symbol: s.symbol, price: s.price }))
        });

        // Keep only last 30 entries in history
        if (database.signalHistory.length > 30) {
            database.signalHistory = database.signalHistory.slice(-30);
        }

        // Save database
        this.saveSignalsDatabase(database);

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        
        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SIGNAL ANALYSIS COMPLETE');
        console.log('='.repeat(60));
        console.log(`Total stocks analyzed: ${processedCount}`);
        console.log(`Errors encountered: ${errorCount}`);
        console.log(`Duration: ${duration} seconds`);
        console.log('');
        console.log(`BUY signals: ${newBuySignals.length}`);
        console.log(`SELL signals: ${newSellSignals.length}`);
        console.log(`NEUTRAL: ${neutralStocks.length}`);
        console.log('');
        
        if (newBuySignals.length > 0) {
            console.log('BUY SIGNALS:');
            newBuySignals.forEach(s => {
                console.log(`  - ${s.symbol}: Rs. ${s.price} (RSI: ${s.details.rsiFast}/${s.details.rsiSlow})`);
            });
            console.log('');
        }
        
        if (newSellSignals.length > 0) {
            console.log('SELL SIGNALS:');
            newSellSignals.forEach(s => {
                console.log(`  - ${s.symbol}: Rs. ${s.price} (RSI: ${s.details.rsiFast}/${s.details.rsiSlow})`);
            });
            console.log('');
        }
        
        console.log('='.repeat(60));
    }

    /**
     * Run analysis
     */
    run() {
        this.analyzeAllStocks();
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new SignalAnalyzer();
    analyzer.run();
}

module.exports = SignalAnalyzer;
