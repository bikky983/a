/**
 * Stock Notification System Configuration
 */
module.exports = {
    // Email configuration
    email: {
        service: 'gmail', // email service (gmail, outlook, etc)
        from: process.env.EMAIL_FROM || 'your-email@example.com',
        recipients: (process.env.EMAIL_RECIPIENTS || '').split(','),
        subjectPrefix: '[NEPSE Stock Alert] '
    },
    
    // Notification timing (in cron format)
    schedule: {
        // Default: Run daily at 8:00 AM
        notificationCron: process.env.NOTIFICATION_CRON || '0 8 * * *'
    },
    
    // Criteria thresholds - matching exactly with website settings
    criteria: {
        // Institutional activity criteria
        institutionalActivity: {
            thresholds: [0.5, 0.65, 0.8],
            minPercentChange: 1.0, // minimum percent change to be included
            minScoreThreshold: 0.5,
            volumeThreshold: 2,
            obvThreshold: 15,
            manipulationThreshold: 3,
            detectVolume: true,
            detectOBV: true,
            detectVSA: true,
            detectWyckoff: true,
            detectManipulation: true,
            detectPriceAction: true,
            detectStatisticalAnomalies: true,
            detectVwapDeviation: true,
            thresholdLevels: [0.5, 0.65, 0.8]
        },
        
        // Enhanced trendline criteria
        trendline: {
            minPercentChange: 2.0, // minimum percent change
            periodToCheck: 7, // days to check for new vs existing uptrends
            lookbackPeriod: 180,
            minTouches: 3,
            proximityThreshold: 2,
            atrMultiplier: 0.5,
            minTrendDuration: 14,
            minTrendQuality: "medium",
            requireVolumeConfirmation: true,
            trendDirection: "uptrend",
            showDashboardStocksOnly: true
        },
        
        // Heatmap volume criteria
        heatmap: {
            topNbyVolume: 5, // increased from 3 to 5 to show more stocks per sector
            minVolume: 100000, // minimum volume to be considered
            analysisDays: 7,
            minThreshold: -3,
            maxThreshold: 4,
            dashboardStocksOnly: true,
            viewMode: "volume"
        },
        
        // RSI support level criteria
        rsiSupport: {
            maxRSI: 35, // updated to match website's maxRsiValue
            maxDistanceFromSupport: 5, // percentage from support level
            rsiPeriod: 14,
            filterSupport1: true,
            filterSupport2: true,
            filterSupport3: true,
            filterMinPercentage: -2,
            filterMaxPercentage: 5
        }
    },
    
    // Data storage paths
    storage: {
        previousAlerts: 'server/notifications/data/previous-alerts.json',
        dataPath: 'data-scripts/organized_nepse_data.json'
    }
}; 