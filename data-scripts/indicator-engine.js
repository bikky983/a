/**
 * RSI Pivot Trendline Strategy - JavaScript Implementation
 * Converted from Pine Script indicator
 */

class IndicatorEngine {
    constructor(config = {}) {
        // RSI Settings
        this.rsiFastPeriod = config.rsiFastPeriod || 21;
        this.rsiSlowPeriod = config.rsiSlowPeriod || 55;
        
        // Pivot Detection Settings
        this.pivotLookback = config.pivotLookback || 5;
        this.minPivotDistance = config.minPivotDistance || 10;
    }

    /**
     * Calculate RSI for a given period
     */
    calculateRSI(data, period) {
        if (data.length < period + 1) return null;

        let gains = 0;
        let losses = 0;

        // Initial average gain/loss
        for (let i = 1; i <= period; i++) {
            const change = data[i].close - data[i - 1].close;
            if (change > 0) gains += change;
            else losses += Math.abs(change);
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        const rsiValues = [];
        
        // First RSI value
        const rs = avgGain / (avgLoss || 0.0001);
        rsiValues.push(100 - (100 / (1 + rs)));

        // Subsequent RSI values using smoothed averages
        for (let i = period + 1; i < data.length; i++) {
            const change = data[i].close - data[i - 1].close;
            const gain = change > 0 ? change : 0;
            const loss = change < 0 ? Math.abs(change) : 0;

            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;

            const rs = avgGain / (avgLoss || 0.0001);
            rsiValues.push(100 - (100 / (1 + rs)));
        }

        return rsiValues;
    }

    /**
     * Detect pivot highs
     */
    detectPivotHighs(data, lookback) {
        const pivots = [];
        
        for (let i = lookback; i < data.length - lookback; i++) {
            let isPivot = true;
            const currentHigh = data[i].high;

            // Check left side
            for (let j = i - lookback; j < i; j++) {
                if (data[j].high >= currentHigh) {
                    isPivot = false;
                    break;
                }
            }

            // Check right side
            if (isPivot) {
                for (let j = i + 1; j <= i + lookback; j++) {
                    if (data[j].high >= currentHigh) {
                        isPivot = false;
                        break;
                    }
                }
            }

            if (isPivot) {
                pivots.push({ index: i, price: currentHigh, time: data[i].time });
            }
        }

        return pivots;
    }

    /**
     * Detect pivot lows
     */
    detectPivotLows(data, lookback) {
        const pivots = [];
        
        for (let i = lookback; i < data.length - lookback; i++) {
            let isPivot = true;
            const currentLow = data[i].low;

            // Check left side
            for (let j = i - lookback; j < i; j++) {
                if (data[j].low <= currentLow) {
                    isPivot = false;
                    break;
                }
            }

            // Check right side
            if (isPivot) {
                for (let j = i + 1; j <= i + lookback; j++) {
                    if (data[j].low <= currentLow) {
                        isPivot = false;
                        break;
                    }
                }
            }

            if (isPivot) {
                pivots.push({ index: i, price: currentLow, time: data[i].time });
            }
        }

        return pivots;
    }

    /**
     * Filter pivots by minimum distance
     */
    filterPivotsByDistance(pivots, minDistance) {
        if (pivots.length === 0) return [];

        const filtered = [pivots[0]];
        
        for (let i = 1; i < pivots.length; i++) {
            const lastPivot = filtered[filtered.length - 1];
            if (pivots[i].index - lastPivot.index >= minDistance) {
                filtered.push(pivots[i]);
            }
        }

        return filtered;
    }

    /**
     * Calculate trendline price at a given index
     */
    getTrendlinePrice(x1, y1, x2, y2, targetX) {
        if (x1 === x2) return y1;
        const slope = (y2 - y1) / (x2 - x1);
        return y1 + slope * (targetX - x1);
    }

    /**
     * Analyze stock data and generate signals
     */
    analyzeStock(stockData) {
        // Sort data by time
        const data = [...stockData].sort((a, b) => {
            const timeA = new Date(a.time.replace(/_/g, '-'));
            const timeB = new Date(b.time.replace(/_/g, '-'));
            return timeA - timeB;
        });

        if (data.length < Math.max(this.rsiSlowPeriod, this.pivotLookback * 2) + 10) {
            return { signal: 'INSUFFICIENT_DATA', details: null };
        }

        // Calculate RSI values
        const rsiFast = this.calculateRSI(data, this.rsiFastPeriod);
        const rsiSlow = this.calculateRSI(data, this.rsiSlowPeriod);

        if (!rsiFast || !rsiSlow || rsiFast.length === 0 || rsiSlow.length === 0) {
            return { signal: 'INSUFFICIENT_DATA', details: null };
        }

        // Detect RSI state at the latest bar
        const latestIdx = rsiFast.length - 1;
        const latestIdxSlow = rsiSlow.length - 1;
        
        // Check if we have valid RSI values
        if (latestIdx < 0 || latestIdxSlow < 0 || 
            rsiFast[latestIdx] === undefined || rsiSlow[latestIdxSlow] === undefined) {
            return { signal: 'INSUFFICIENT_DATA', details: null };
        }
        
        const rsiBullish = rsiFast[latestIdx] > rsiSlow[latestIdxSlow];
        const rsiBearish = rsiFast[latestIdx] < rsiSlow[latestIdxSlow];

        // Find last RSI crossover
        let lastCrossUp = -1;
        let lastCrossDown = -1;

        const minLength = Math.min(rsiFast.length, rsiSlow.length);
        for (let i = 1; i < minLength; i++) {
            if (rsiFast[i] !== undefined && rsiSlow[i] !== undefined &&
                rsiFast[i - 1] !== undefined && rsiSlow[i - 1] !== undefined) {
                if (rsiFast[i] > rsiSlow[i] && rsiFast[i - 1] <= rsiSlow[i - 1]) {
                    lastCrossUp = i;
                }
                if (rsiFast[i] < rsiSlow[i] && rsiFast[i - 1] >= rsiSlow[i - 1]) {
                    lastCrossDown = i;
                }
            }
        }

        // Detect pivots
        const pivotHighs = this.detectPivotHighs(data, this.pivotLookback);
        const pivotLows = this.detectPivotLows(data, this.pivotLookback);

        // Filter by minimum distance
        const filteredHighs = this.filterPivotsByDistance(pivotHighs, this.minPivotDistance);
        const filteredLows = this.filterPivotsByDistance(pivotLows, this.minPivotDistance);

        // Get recent pivots for trendline construction
        const recentHighs = filteredHighs.slice(-3);
        const recentLows = filteredLows.slice(-3);

        // Check for BUY signal
        if (rsiBullish && recentHighs.length >= 2) {
            const h1 = recentHighs[recentHighs.length - 2];
            const h2 = recentHighs[recentHighs.length - 1];

            // Check if it's a descending line (lower high)
            if (h2.price < h1.price) {
                // Calculate downtrend line price at current bar
                const currentIdx = data.length - 1;
                const downtrendPrice = this.getTrendlinePrice(h1.index, h1.price, h2.index, h2.price, currentIdx);

                // Check if price broke above downtrend
                const currentClose = data[currentIdx].close;
                const prevClose = data[currentIdx - 1].close;

                if (currentClose > downtrendPrice && prevClose <= downtrendPrice) {
                    return {
                        signal: 'BUY',
                        date: data[currentIdx].time,
                        price: currentClose,
                        details: {
                            rsiFast: rsiFast[latestIdx].toFixed(2),
                            rsiSlow: rsiSlow[latestIdxSlow].toFixed(2),
                            downtrendPrice: downtrendPrice.toFixed(2),
                            breakoutStrength: ((currentClose - downtrendPrice) / downtrendPrice * 100).toFixed(2)
                        }
                    };
                }
            }
        }

        // Check for SELL signal
        if (rsiBearish && recentLows.length >= 2) {
            const l1 = recentLows[recentLows.length - 2];
            const l2 = recentLows[recentLows.length - 1];

            // Check if it's an ascending line (higher low)
            if (l2.price > l1.price) {
                // Calculate uptrend line price at current bar
                const currentIdx = data.length - 1;
                const uptrendPrice = this.getTrendlinePrice(l1.index, l1.price, l2.index, l2.price, currentIdx);

                // Check if price broke below uptrend
                const currentClose = data[currentIdx].close;
                const prevClose = data[currentIdx - 1].close;

                if (currentClose < uptrendPrice && prevClose >= uptrendPrice) {
                    return {
                        signal: 'SELL',
                        date: data[currentIdx].time,
                        price: currentClose,
                        details: {
                            rsiFast: rsiFast[latestIdx].toFixed(2),
                            rsiSlow: rsiSlow[latestIdxSlow].toFixed(2),
                            uptrendPrice: uptrendPrice.toFixed(2),
                            breakdownStrength: ((uptrendPrice - currentClose) / uptrendPrice * 100).toFixed(2)
                        }
                    };
                }
            }
        }

        return {
            signal: 'NEUTRAL',
            date: data[data.length - 1].time,
            price: data[data.length - 1].close,
            details: {
                rsiFast: rsiFast[latestIdx].toFixed(2),
                rsiSlow: rsiSlow[latestIdxSlow].toFixed(2),
                rsiBullish,
                rsiBearish
            }
        };
    }
}

module.exports = IndicatorEngine;
