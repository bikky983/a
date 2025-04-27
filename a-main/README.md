# NEPSE Stock Screener with Data Downloader

A web application that provides stock screening for Nepal Stock Exchange, including automated data downloading and processing.

## Features

- **NEPSE Stock Screener**: Web interface for screening stocks
- **Automated Data Download**: Downloads daily price data from NEPSE website at 3:10 PM Nepal time
- **Data Processing**: Processes downloaded data using Python at 3:15 PM Nepal time
- **Data API**: Provides access to processed data via API endpoints
- **Direct Data Access**: Makes processed data available directly via public URL

## Directory Structure

- `/public`: Static files and processed data (organized_nepse_data.json)
- `/server`: Server-side code for stock screener
- `/data-scripts`: Scripts for automated data downloading and processing
  - `nepse_downloader.js`: Downloads daily price data from NEPSE website
  - `1.5yr.py`: Processes downloaded data and maintains a 1.5-year history
  - `run_py_script.js`: Handles running the Python script
  - `scheduler.js`: Coordinates the scheduling of all tasks

## Installation

1. Install dependencies:
```bash
npm install
```

2. Make sure Python and required packages are installed:
```bash
pip install pandas
```

## Usage

### Start the web server with automated data collection
```bash
npm start
```

This will start the web server and initialize the schedulers for data collection.

### Run individual components

Run only the NEPSE downloader:
```bash
npm run nepse:download
```

Run only the data processor:
```bash
npm run nepse:process
```

Start only the scheduler (without web server):
```bash
npm run nepse:start
```

Run all data collection tasks immediately for testing:
```bash
npm run nepse:test
```

## API Endpoints

- `/api/stocks`: Get screened stocks data
- `/api/prices`: Get current stock prices
- `/api/nepse-data`: Get processed historical NEPSE data
- `/organized_nepse_data.json`: Direct access to the processed data file

## Scheduling

- NEPSE Downloader runs at 3:10 PM Nepal time (UTC+5:45)
- Data Processor runs at 3:15 PM Nepal time (UTC+5:45)

## Data Storage

Processed data is stored in two locations:
- Primary: `/public/organized_nepse_data.json` (accessible via web)
- Backup: `/data-scripts/organized_nepse_data.json`
