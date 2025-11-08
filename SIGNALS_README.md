# 📊 Trading Signals System

## Overview

This system implements an automated trading signal generator based on the **RSI Pivot Trendline Strategy**. It analyzes all stocks in the NEPSE market daily and generates BUY and SELL signals.

## Features

### 🎯 Signal Generation
- **BUY Signal**: Generated when RSI is bullish (Fast RSI > Slow RSI) AND price breaks above the downtrend line
- **SELL Signal**: Generated when RSI is bearish (Fast RSI < Slow RSI) AND price breaks below the uptrend line

### 📈 Indicator Parameters
- **RSI Fast Period**: 21
- **RSI Slow Period**: 55
- **Pivot Lookback**: 5 bars (left/right)
- **Minimum Pivot Distance**: 10 bars

### 🗄️ Database
All signals are stored in `public/signals-database.json` with the following structure:
```json
{
  "lastUpdated": "ISO timestamp",
  "currentBuySignals": [...],
  "currentSellSignals": [...],
  "signalHistory": [...]
}
```

## Files Created

### Backend Scripts
1. **`data-scripts/indicator-engine.js`**
   - JavaScript implementation of the Pine Script indicator
   - Handles RSI calculation, pivot detection, and trendline analysis
   - Generates BUY/SELL signals based on strategy rules

2. **`data-scripts/signal-analyzer.js`**
   - Runs the indicator on all stocks from `organized_nepse_data.json`
   - Updates the signals database
   - Maintains 30-day signal history

### Frontend Files
3. **`public/signals.html`**
   - Beautiful dashboard displaying current signals
   - Shows BUY and SELL signals with details
   - Displays 30-day signal history

4. **`public/signals.js`**
   - Frontend JavaScript for the signals dashboard
   - Handles data loading and rendering
   - Auto-refreshes every 5 minutes

5. **`public/signals-database.json`**
   - JSON database storing all signals
   - Updated automatically by GitHub Actions

### Automation
6. **`.github/workflows/daily-signal-analysis.yml`**
   - GitHub Actions workflow
   - Runs daily at **7:00 PM Nepal Time (NPT)**
   - Automatically commits and pushes updated signals

## Usage

### Manual Analysis
Run signal analysis manually:
```bash
npm run analyze-signals
# or
npm run signals
```

### Automated Analysis
The system runs automatically every day at 7:00 PM NPT via GitHub Actions.

### View Signals
Open the signals dashboard in your browser:
```
https://your-website.com/signals.html
```

## How It Works

### 1. Data Collection
- Reads stock data from `public/organized_nepse_data.json`
- Groups data by stock symbol
- Ensures sufficient historical data for analysis

### 2. Signal Analysis
For each stock:
1. Calculate RSI Fast (21 period) and RSI Slow (55 period)
2. Detect pivot highs and pivot lows
3. Construct trendlines from recent pivots
4. Check for breakouts/breakdowns
5. Generate BUY/SELL signals when conditions are met

### 3. Database Update
- Current signals replace previous day's signals
- Historical data is appended (last 30 days kept)
- Database is saved to `public/signals-database.json`

### 4. Display
- Dashboard loads signals from database
- Shows current BUY and SELL signals
- Displays signal history with statistics
- Auto-refreshes to show latest data

## Signal Details

Each signal includes:
- **Symbol**: Stock ticker symbol
- **Signal Type**: BUY or SELL
- **Date**: Date when signal was generated
- **Price**: Stock price at signal generation
- **RSI Fast**: Fast RSI value
- **RSI Slow**: Slow RSI value
- **Trendline Price**: Price of the trendline at breakout/breakdown
- **Strength**: Percentage strength of breakout/breakdown

## GitHub Actions Schedule

The workflow runs at:
- **Time**: 7:00 PM Nepal Time (NPT)
- **Cron**: `15 13 * * *` (1:15 PM UTC = 7:00 PM NPT)
- **Frequency**: Daily

You can also trigger it manually from the GitHub Actions tab.

## Monitoring

### Workflow Summary
After each run, GitHub Actions creates a summary showing:
- Number of BUY signals
- Number of SELL signals
- List of stocks with signals
- Execution status

### Dashboard
The signals dashboard shows:
- Last update timestamp
- Current signal counts
- Detailed signal information
- 30-day historical trends

## Notes

- The system analyzes ALL stocks in `organized_nepse_data.json`
- Signals are generated based on technical analysis only
- Past performance does not guarantee future results
- Always do your own research before trading
- The database is automatically updated and committed to the repository

## Troubleshooting

### No signals generated
- Check if `organized_nepse_data.json` has recent data
- Verify stocks have sufficient historical data (55+ bars)
- Review GitHub Actions logs for errors

### Workflow not running
- Check GitHub Actions is enabled for the repository
- Verify the cron schedule in the workflow file
- Check repository permissions

### Dashboard not loading
- Ensure `signals-database.json` exists in the public folder
- Check browser console for errors
- Verify the file is accessible via your web server

## Future Enhancements

Possible improvements:
- Email/SMS notifications for new signals
- Backtesting functionality
- Multiple indicator strategies
- Custom alert thresholds
- Performance tracking
- Mobile app integration

---

**Created**: November 2024  
**Strategy**: RSI Pivot Trendline Strategy  
**Automation**: GitHub Actions  
**Update Frequency**: Daily at 7:00 PM NPT
