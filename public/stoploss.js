// Global variables
let boughtStocks = [];
let currentPrices = {};
let stoplossStocks = [];
let stockHistoricalData = {}; // To store historical data
let chartInstances = {}; // To store chart instances by symbol
let autoRefreshInterval = null;
const DEFAULT_STOPLOSS_PERCENT = 15;

document.addEventListener('DOMContentLoaded', function() {
    // Store reference to common watchlist function to avoid naming conflicts
    // IMPORTANT: Save the reference before our own toggleWatchlist is exported
    if (typeof window.toggleWatchlist === 'function') {
        window.commonToggleWatchlist = window.toggleWatchlist;
        // Don't delete the original as other scripts may depend on it
    }
    
    initializePage();
    setupEventListeners();
    
    // Create chart popup element if not exists
    if (!document.querySelector('.chart-popup')) {
        createChartPopup();
    }
    
    // Initialize watchlist with our local function registered
    window.toggleWatchlist = toggleWatchlist; // Export our function
    if (typeof initWatchlist === 'function') {
        initWatchlist();
    }
    
    // Fetch historical data
    fetchHistoricalData();
    
    // Start auto-refresh if enabled
    setupAutoRefresh();
    
    // Setup Excel upload and download event listeners
    setupExcelHandlers();
});

// Create chart popup element
function createChartPopup() {
    const popupElement = document.createElement('div');
    popupElement.className = 'chart-popup';
    popupElement.innerHTML = `
        <div class="chart-popup-content">
            <div class="chart-popup-header">
                <h3 id="popupChartTitle">Stock Chart</h3>
                <button class="chart-popup-close">&times;</button>
            </div>
            <div class="chart-popup-body">
                <div id="popupChartContainer"></div>
            </div>
        </div>
    `;
    document.body.appendChild(popupElement);
    
    // Add event listener to close button
    document.querySelector('.chart-popup-close').addEventListener('click', () => {
        document.querySelector('.chart-popup').style.display = 'none';
    });
}

function initializePage() {
    // Load basic data
    loadBoughtStocks();
    
    // Comprehensive data loading and processing with error handling
    loadStoplossData();
}

function setupEventListeners() {
    document.getElementById('refreshStoplossListBtn').addEventListener('click', () => {
        fetchCurrentPrices().then(() => {
            processStoplossStocks();
        });
    });
    
    // Auto-refresh toggle
    const autoRefreshBtn = document.getElementById('autoRefreshBtn');
    const isAutoRefreshEnabled = localStorage.getItem('autoRefreshEnabled') === 'true';
    autoRefreshBtn.textContent = isAutoRefreshEnabled ? 'Disable Auto Refresh' : 'Enable Auto Refresh';
    autoRefreshBtn.addEventListener('click', toggleAutoRefresh);
    
    // Default stoploss percentage
    document.getElementById('defaultStoplossPercent').addEventListener('change', (e) => {
        const value = parseInt(e.target.value);
        if (value > 0 && value <= 100) {
            localStorage.setItem('defaultStoplossPercent', value.toString());
            processStoplossStocks();
        }
    });
    
    // Show broken stoploss checkbox
    document.getElementById('showBrokenStoploss').addEventListener('change', () => {
        processStoplossStocks();
    });
    
    // Set default stoploss percent from localStorage or default
    const storedStoplossPercent = localStorage.getItem('defaultStoplossPercent');
    if (storedStoplossPercent) {
        document.getElementById('defaultStoplossPercent').value = storedStoplossPercent;
    }
    
    // Handle window resize for responsive charts
    window.addEventListener('resize', () => {
        // Resize all charts
        Object.keys(chartInstances).forEach(symbol => {
            const chart = chartInstances[symbol];
            if (chart && chart.chart) {
                const container = chart.container;
                if (container && container.offsetWidth > 0) {
                    chart.chart.applyOptions({
                        width: container.offsetWidth,
                        height: container.offsetHeight
                    });
                }
            }
        });
    });
}

// Setup Excel upload and download functionality
function setupExcelHandlers() {
    // Set up download Excel button
    document.getElementById('downloadExcel').addEventListener('click', function() {
        // Get bought stocks for export
        const boughtStocks = JSON.parse(localStorage.getItem('boughtStocks') || '[]');
        
        // Format data to match the simpler format shown in the image
        const formattedData = boughtStocks.map(stock => {
            return {
                'SYMBOL': stock.symbol,
                'BUY/SELL': 'Buy',
                'TRADE QTY': stock.quantity || 10,
                'PRICE(NPR)': stock.buyPrice
            };
        });
        
        // Create worksheet with the formatted data
        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        
        // Create a workbook
        const workbook = XLSX.utils.book_new();
        
        // Add the worksheet
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Stoploss');
        
        // Generate buffer and download
        XLSX.writeFile(workbook, 'stoploss_stocks.xlsx');
    });

    // Set up upload Excel button
    document.getElementById('uploadExcel').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            let json = [];
            
            // Check if it's a CSV file
            if (file.name.toLowerCase().endsWith('.csv')) {
                // Parse CSV data
                const csvData = e.target.result;
                const lines = csvData.split(/\r?\n/); // Handle different line endings
                
                if (lines.length === 0) {
                    showError('No data found in the CSV file');
                    return;
                }
                
                // Detect delimiter - check if it's tab, comma, or space separated
                let delimiter = ','; // Default delimiter
                const firstLine = lines[0];
                
                // Count occurrences of potential delimiters
                const delimiterCounts = {
                    ',': (firstLine.match(/,/g) || []).length,
                    '\t': (firstLine.match(/\t/g) || []).length,
                    ' ': (firstLine.match(/ {2,}/g) || []).length // Multiple spaces as delimiter
                };
                
                // Determine most likely delimiter
                if (delimiterCounts['\t'] > 0) {
                    delimiter = '\t';
                } else if (delimiterCounts[','] > 0) {
                    delimiter = ',';
                } else if (delimiterCounts[' '] > 0) {
                    // For space delimited files, we'll split by multiple spaces
                    delimiter = ' ';
                }
                
                // Extract headers (first line)
                let headers;
                if (delimiter === ' ') {
                    // For space-delimited files, split by multiple spaces and trim
                    headers = firstLine.split(/\s{2,}/).map(header => header.trim());
                } else {
                    headers = firstLine.split(delimiter).map(header => header.trim());
                }
                
                // Process each line
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim() === '') continue; // Skip empty lines
                    
                    let values;
                    if (delimiter === ' ') {
                        // For space-delimited files, split by multiple spaces
                        values = lines[i].split(/\s{2,}/).map(value => value.trim());
                    } else {
                        values = lines[i].split(delimiter).map(value => value.trim());
                    }
                    
                    const row = {};
                    
                    // Map values to headers
                    headers.forEach((header, index) => {
                        if (index < values.length) {
                            row[header] = values[index];
                        }
                    });
                    
                    json.push(row);
                }
                
                // Handle specific format from the user's image
                // Map column names to expected fields if needed
                json = json.map(row => {
                    const mappedRow = {...row};
                    
                    // Map common column names from the user's format
                    if (row['CONTRACT NO'] !== undefined) mappedRow['CONTRACT_NO'] = row['CONTRACT NO'];
                    if (row['CLIENT'] !== undefined) mappedRow['CLIENT_ID'] = row['CLIENT'];
                    if (row['CLIENT NAME'] !== undefined) mappedRow['CLIENT_NAME'] = row['CLIENT NAME'];
                    if (row['SYMBOL'] !== undefined) mappedRow['SYMBOL'] = row['SYMBOL'];
                    if (row['TYPE'] !== undefined) mappedRow['BUY'] = row['TYPE']; // Map TYPE to BUY for compatibility
                    if (row['PRICE'] !== undefined) mappedRow['PRICE'] = row['PRICE'];
                    if (row['QTY'] !== undefined) mappedRow['QTY'] = row['QTY'];
                    if (row['VALUE'] !== undefined) mappedRow['VALUE'] = row['VALUE'];
                    if (row['ORDER ID'] !== undefined) mappedRow['ORDER_ID'] = row['ORDER ID'];
                    if (row['TRADE TIME'] !== undefined) mappedRow['TRADE_TIME'] = row['TRADE TIME'];
                    
                    return mappedRow;
                });
            } else {
                // Process Excel file as before
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                if (workbook.SheetNames.length > 0) {
                    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                    json = XLSX.utils.sheet_to_json(worksheet);
                } else {
                    showError('Invalid Excel file: No sheets found');
                    return;
                }
            }
            
            if (json.length === 0) {
                showError('No data found in the file');
                return;
            }
            
            // Log the first row to check structure
            console.log("First row of imported data:", json[0]);
            
            // Get existing bought stocks
            const existingBoughtStocks = JSON.parse(localStorage.getItem('boughtStocks') || '[]');
            
            // Process each row from the file - support both traditional format and new CSV format
            const newBoughtStocks = json
                .filter(row => {
                    // For traditional Excel format
                    if (row['BUY/SELL'] !== undefined) {
                        return row['BUY/SELL'] === 'Buy' || row['BUY/SELL'] === 'buy';
                    }
                    
                    // For BUY column format
                    if (row.BUY !== undefined) {
                        return row.BUY === 'Buy' || row.BUY === 'buy';
                    }
                    
                    // For TYPE column format (from user's CSV)
                    if (row.TYPE !== undefined) {
                        return row.TYPE === 'Buy' || row.TYPE === 'buy';
                    }
                    
                    return false;
                })
                .map(row => {
                    // Today's date as string in ISO format - this will be the import date
                    const today = new Date().toISOString().split('T')[0];
                    
                    // Try to extract actual date from TRADE TIME if available
                    let buyDate = today;
                    if (row['TRADE TIME']) {
                        try {
                            // Example format: 2025-04-27 14:40:22
                            const datePart = row['TRADE TIME'].split(' ')[0];
                            if (datePart && datePart.includes('-')) {
                                buyDate = datePart;
                            }
                        } catch (e) {
                            console.error('Error parsing trade date:', e);
                        }
                    } else if (row['TRADE_TIME']) {
                        try {
                            // Alternative field name
                            const datePart = row['TRADE_TIME'].split(' ')[0];
                            if (datePart && datePart.includes('-')) {
                                buyDate = datePart;
                            }
                        } catch (e) {
                            console.error('Error parsing trade date:', e);
                        }
                    }
                    
                    // Extract symbol - handle different possible column names
                    const symbol = row.SYMBOL || row.Symbol || row.symbol;
                    
                    // Extract price - handle different possible column names
                    let buyPrice = 0;
                    if (row['PRICE(NPR)'] !== undefined) {
                        buyPrice = Number(row['PRICE(NPR)']);
                    } else if (row.PRICE !== undefined) {
                        buyPrice = Number(row.PRICE);
                    } else if (row.Price !== undefined) {
                        buyPrice = Number(row.Price);
                    }
                    
                    // Extract quantity - handle different possible column names
                    let quantity = 10; // Default
                    if (row['TRADE QTY'] !== undefined) {
                        quantity = Number(row['TRADE QTY']);
                    } else if (row.QTY !== undefined) {
                        quantity = Number(row.QTY);
                    } else if (row.Quantity !== undefined) {
                        quantity = Number(row.Quantity);
                    }
                    
                    // Calculate default stoploss price (15% below buy price)
                    const defaultStoplossPercent = parseInt(document.getElementById('defaultStoplossPercent').value) || DEFAULT_STOPLOSS_PERCENT;
                    const stoplossPrice = buyPrice * (1 - defaultStoplossPercent / 100);
                    
                    // Force LTP (last traded price) to be set to ensure proper evaluation
                    // This ensures that the uploaded stock will be properly evaluated for stoploss breaks
                    const currentPrice = currentPrices[symbol] || (buyPrice * 0.95); // Use 95% of buy price as fallback
                    
                    // Calculate return percentage
                    const returnPercent = ((currentPrice - buyPrice) / buyPrice) * 100;
                    
                    // Calculate stoploss difference
                    const stoplossDiff = ((currentPrice - stoplossPrice) / stoplossPrice) * 100;
                    
                    // Check if stoploss is broken
                    const isBroken = currentPrice <= stoplossPrice;
                    
                    return {
                        symbol: symbol,
                        buyPrice: buyPrice,
                        buyDate: buyDate,
                        stoplossPrice: stoplossPrice,
                        quantity: quantity,
                        ltp: currentPrice,
                        returnPercent: returnPercent,
                        stoplossDiff: stoplossDiff,
                        isBroken: isBroken  // Pre-evaluate if stoploss is broken
                    };
                });
            
            if (newBoughtStocks.length === 0) {
                showError('No valid buy trades found in the file');
                return;
            }
            
            // Remove duplicates and merge with existing stocks
            const mergedStocks = [...existingBoughtStocks];
            
            newBoughtStocks.forEach(newStock => {
                // Find if this stock already exists
                const existingIndex = mergedStocks.findIndex(stock => stock.symbol === newStock.symbol);
                
                if (existingIndex >= 0) {
                    // Update existing stock
                    mergedStocks[existingIndex] = {
                        ...mergedStocks[existingIndex],
                        ...newStock
                    };
                } else {
                    // Add new stock
                    mergedStocks.push(newStock);
                }
            });
            
            // Save the updated bought stocks
            localStorage.setItem('boughtStocks', JSON.stringify(mergedStocks));
            
            // Reload the bought stocks
            loadBoughtStocks();
            
            // Ensure we have current prices for the newly added stocks
            fetchCurrentPrices().then(() => {
                // Process stoploss stocks with the latest prices
                processStoplossStocks();
                
                showSuccess(`${newBoughtStocks.length} stocks imported successfully!`);
            }).catch(error => {
                console.error('Error fetching prices after import:', error);
                // Still try to process with whatever prices we have
                processStoplossStocks();
                
                showSuccess(`${newBoughtStocks.length} stocks imported successfully!`);
            });
        };
        
        // Read the file - determine how to read it based on file type
        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsArrayBuffer(file);
        }
    });
}

function setupAutoRefresh() {
    clearInterval(autoRefreshInterval);
    
    const isAutoRefreshEnabled = localStorage.getItem('autoRefreshEnabled') === 'true';
    if (isAutoRefreshEnabled) {
        // Refresh prices every 60 seconds
        autoRefreshInterval = setInterval(() => {
            fetchCurrentPrices().then(() => {
                processStoplossStocks();
            });
        }, 60000);
    }
}

function toggleAutoRefresh() {
    const autoRefreshBtn = document.getElementById('autoRefreshBtn');
    const isCurrentlyEnabled = localStorage.getItem('autoRefreshEnabled') === 'true';
    
    // Toggle the state
    const newState = !isCurrentlyEnabled;
    localStorage.setItem('autoRefreshEnabled', newState.toString());
    
    // Update button text
    autoRefreshBtn.textContent = newState ? 'Disable Auto Refresh' : 'Enable Auto Refresh';
    
    // Setup auto-refresh based on new state
    setupAutoRefresh();
    
    showSuccess(`Auto refresh ${newState ? 'enabled' : 'disabled'}`);
}

function loadBoughtStocks() {
    boughtStocks = JSON.parse(localStorage.getItem('boughtStocks') || '[]');
}

async function fetchCurrentPrices() {
    showLoading(true);
    try {
        // Try to load prices from localStorage first (set by dashboard)
        const storedPrices = localStorage.getItem('currentPrices');
        
        if (storedPrices) {
            currentPrices = JSON.parse(storedPrices);
            showLoading(false);
            return currentPrices;
        }
        
        // Fallback to API if localStorage prices are not available
        console.warn('No stored prices found in localStorage. Using API fallback.');
        const response = await fetch('/api/prices');
        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }
        const prices = await response.json();
        
        // Update current prices
        currentPrices = prices;
        
        // Store in localStorage for other pages
        localStorage.setItem('currentPrices', JSON.stringify(prices));
        
        showLoading(false);
        return prices;
    } catch (error) {
        console.error('Error fetching current prices:', error);
        showError('Failed to fetch current prices');
        showLoading(false);
        return {};
    }
}

function processStoplossStocks() {
    const defaultStoplossPercent = parseInt(document.getElementById('defaultStoplossPercent').value) || DEFAULT_STOPLOSS_PERCENT;
    
    stoplossStocks = [];
    
    boughtStocks.forEach(stock => {
        // Get current price from currentPrices object, fallback to 0
        let currentPrice = currentPrices[stock.symbol] || 0;
        
        // Skip stocks without a price only if we're in strict mode
        // For uploaded stocks, we want to include them even without a current price
        // and evaluate stoploss based on the buy price if needed
        if (currentPrice <= 0) {
            console.warn(`No current price found for ${stock.symbol}, using buy price to evaluate stoploss`);
            // Use a slightly lower price than the buy price to evaluate stoploss
            // This makes sure uploaded stocks are visible but not marked as broken stoploss by default
            currentPrice = stock.buyPrice * 0.95;
        }
        
        // Calculate return percentage
        const returnPercent = ((currentPrice - stock.buyPrice) / stock.buyPrice) * 100;
        
        // Calculate stoploss price
        const stoplossPrice = stock.stoplossPrice || (stock.buyPrice * (1 - defaultStoplossPercent / 100));
        
        // Calculate stoploss difference
        const stoplossDiff = ((currentPrice - stoplossPrice) / stoplossPrice) * 100;
        
        // Check if stoploss is broken
        // Use pre-calculated isBroken value if available (from imports)
        const isBroken = (stock.isBroken !== undefined) 
            ? stock.isBroken 
            : (currentPrice <= stoplossPrice);
        
        stoplossStocks.push({
            symbol: stock.symbol,
            ltp: currentPrice,
            buyPrice: stock.buyPrice,
            returnPercent: returnPercent,
            stoplossPrice: stoplossPrice,
            stoplossDiff: stoplossDiff,
            buyDate: stock.buyDate || 'Unknown',
            quantity: stock.quantity || 10,
            isBroken: isBroken
        });
    });
    
    // Sort by broken stoploss first, then by stoploss difference
    stoplossStocks.sort((a, b) => {
        if (a.isBroken !== b.isBroken) {
            return a.isBroken ? -1 : 1;
        }
        return a.stoplossDiff - b.stoplossDiff;
    });
    
    // Display the stoploss stocks
    displayStoplossStocks();
}

function displayStoplossStocks() {
    const tableBody = document.querySelector('#stoplossTable tbody');
    tableBody.innerHTML = '';
    
    if (stoplossStocks.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="9" class="no-data">No bought stocks found</td>
        `;
        tableBody.appendChild(row);
        
        // Reset stoploss counter
        document.getElementById('stoplossCounter').textContent = '';
        return;
    }
    
    // Clean up old chart instances
    Object.keys(chartInstances).forEach(symbol => {
        if (chartInstances[symbol] && chartInstances[symbol].chart) {
            chartInstances[symbol].chart.remove();
            delete chartInstances[symbol];
        }
    });
    
    const showBrokenStoploss = document.getElementById('showBrokenStoploss').checked;
    
    // Count broken stoploss stocks
    const brokenStoplossCount = stoplossStocks.filter(stock => stock.isBroken).length;
    
    // Update the stoploss counter
    const stoplossCounterEl = document.getElementById('stoplossCounter');
    if (brokenStoplossCount > 0) {
        stoplossCounterEl.textContent = `Alert: ${brokenStoplossCount} stock${brokenStoplossCount > 1 ? 's' : ''} broke stoploss price!`;
        stoplossCounterEl.className = 'has-broken';
    } else {
        stoplossCounterEl.textContent = 'No stocks have broken stoploss price';
        stoplossCounterEl.className = 'no-broken';
    }
    
    stoplossStocks.forEach((stock, index) => {
        const row = document.createElement('tr');
        
        // Add broken-stoploss class if the stock has broken stoploss
        if (stock.isBroken) {
            // Apply the class only if highlighting is enabled
            if (showBrokenStoploss) {
                row.classList.add('broken-stoploss');
                // Add inline style for additional browser compatibility
                row.style.backgroundColor = 'rgba(244, 67, 54, 0.4)';
                row.style.fontWeight = 'bold';
                row.style.borderLeft = '4px solid #f44336';
            }
        }
        
        // Format date
        const buyDate = new Date(stock.buyDate);
        const formattedDate = isNaN(buyDate) ? 'Unknown' : buyDate.toLocaleDateString();
        
        // Create the row HTML content (without the watchlist button)
        row.innerHTML = `
            <td class="clickable-symbol" data-symbol="${stock.symbol}">${stock.symbol}</td>
            <td>${stock.ltp.toFixed(2)}</td>
            <td>
                <input type="number" class="buyprice-input" data-symbol="${stock.symbol}" 
                       value="${stock.buyPrice.toFixed(2)}" step="0.01" min="0">
            </td>
            <td class="${stock.returnPercent >= 0 ? 'positive-return' : 'negative-return'}">${stock.returnPercent.toFixed(2)}%</td>
            <td>
                <input type="number" class="stoploss-input" data-symbol="${stock.symbol}" 
                       value="${stock.stoplossPrice.toFixed(2)}" step="0.01" min="0">
            </td>
            <td class="${stock.stoplossDiff >= 0 ? 'positive-return' : 'negative-return'}">${stock.stoplossDiff.toFixed(2)}%</td>
            <td>${formattedDate}</td>
            <td class="actions-cell">
                <button class="remove-stock-btn" data-symbol="${stock.symbol}">Remove</button>
                <button class="chart-btn" onclick="showFullScreenChart('${stock.symbol}')">Chart</button>
            </td>
            <td class="chart-cell">
                <div id="chart-container-${stock.symbol}" class="chart-container-small"></div>
            </td>
        `;
        
        // Find the actions cell to add the watchlist button
        const actionsCell = row.querySelector('.actions-cell');
        
        if (actionsCell) {
            // Create watchlist button using the common function or directly
            let watchlistBtn;
            if (typeof window.createWatchlistButton === 'function') {
                watchlistBtn = window.createWatchlistButton(stock.symbol);
            } else {
                watchlistBtn = document.createElement('button');
                watchlistBtn.className = 'watchlist-btn';
                watchlistBtn.setAttribute('data-watchlist', stock.symbol);
                watchlistBtn.textContent = '☆';
                watchlistBtn.title = 'Add to Watchlist';
                
                // Add click event listener
                watchlistBtn.addEventListener('click', function() {
                    if (typeof window.toggleWatchlist === 'function') {
                        window.toggleWatchlist(stock.symbol);
                    }
                });
            }
            
            // Insert the button at the beginning of the actions cell
            actionsCell.insertBefore(watchlistBtn, actionsCell.firstChild);
        }
        
        tableBody.appendChild(row);
    });
    
    // Add event listeners for stoploss input
    document.querySelectorAll('.stoploss-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const symbol = e.target.dataset.symbol;
            const newStoplossPrice = parseFloat(e.target.value);
            updateStoplossPrice(symbol, newStoplossPrice);
        });
    });
    
    // Add event listeners for buy price input
    document.querySelectorAll('.buyprice-input').forEach(input => {
        input.addEventListener('change', (e) => {
            const symbol = e.target.dataset.symbol;
            const newBuyPrice = parseFloat(e.target.value);
            updateBuyPrice(symbol, newBuyPrice);
        });
    });
    
    document.querySelectorAll('.remove-stock-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const symbol = e.target.dataset.symbol;
            removeStockFromBought(symbol);
        });
    });
    
    document.querySelectorAll('.clickable-symbol').forEach(symbol => {
        symbol.addEventListener('click', (e) => {
            const symbolText = e.target.dataset.symbol;
            if (symbolText) {
                window.location.href = `dashboard.html#${symbolText}`;
            }
        });
    });
    
    // Initialize watchlist buttons after creating the table
    if (typeof window.initWatchlist === 'function') {
        window.initWatchlist();
    }
    
    // Initialize charts after rows are created
    setTimeout(() => {
        stoplossStocks.forEach(stock => {
            initializeStockChart(stock.symbol, stock.stoplossPrice, stock.buyPrice);
        });
    }, 100);
}

function updateStoplossPrice(symbol, newStoplossPrice) {
    // Update in boughtStocks
    const stockIndex = boughtStocks.findIndex(stock => stock.symbol === symbol);
    if (stockIndex !== -1) {
        boughtStocks[stockIndex].stoplossPrice = newStoplossPrice;
        localStorage.setItem('boughtStocks', JSON.stringify(boughtStocks));
        
        // Update in current display
        processStoplossStocks();
        
        showSuccess(`Updated stoploss for ${symbol} to ${newStoplossPrice.toFixed(2)}`);
    }
}

function updateBuyPrice(symbol, newBuyPrice) {
    // Update in boughtStocks
    const stockIndex = boughtStocks.findIndex(stock => stock.symbol === symbol);
    if (stockIndex !== -1) {
        boughtStocks[stockIndex].buyPrice = newBuyPrice;
        localStorage.setItem('boughtStocks', JSON.stringify(boughtStocks));
        
        // Update in current display
        processStoplossStocks();
        
        showSuccess(`Updated buy price for ${symbol} to ${newBuyPrice.toFixed(2)}`);
    }
}

function removeStockFromBought(symbol) {
    // Remove from boughtStocks
    const stockIndex = boughtStocks.findIndex(stock => stock.symbol === symbol);
    if (stockIndex !== -1) {
        const removedStock = boughtStocks.splice(stockIndex, 1)[0];
        localStorage.setItem('boughtStocks', JSON.stringify(boughtStocks));
        
        // Update in current display
        processStoplossStocks();
        
        showSuccess(`Removed ${symbol} from bought stocks`);
    }
}

// Function to downsample data points - keeps visual accuracy while reducing points
function downsampleData(data, threshold = 500) {
    if (data.length <= threshold) return data;
    
    // Simple method: take every nth item
    const n = Math.ceil(data.length / threshold);
    return data.filter((_, i) => i % n === 0);
}

// Initialize chart for a specific stock
function initializeStockChart(symbol, stoplossPrice, buyPrice) {
    const chartContainer = document.getElementById(`chart-container-${symbol}`);
    if (!chartContainer) return;
    
    // Clear any existing content
    chartContainer.innerHTML = '';
    
    // Check if we have data for this symbol
    if (!stockHistoricalData[symbol] || stockHistoricalData[symbol].length === 0) {
        const noDataLabel = document.createElement('div');
        noDataLabel.textContent = 'No data available';
        noDataLabel.style.position = 'absolute';
        noDataLabel.style.top = '50%';
        noDataLabel.style.left = '50%';
        noDataLabel.style.transform = 'translate(-50%, -50%)';
        noDataLabel.style.color = '#999';
        chartContainer.appendChild(noDataLabel);
        return;
    }
    
    // Process data
    const data = stockHistoricalData[symbol];
    
    // Downsample if needed
    const displayData = downsampleData(data, 200);
    
    // Set up dimensions
    const width = chartContainer.clientWidth;
    const height = 200;
    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    
    // Create SVG
    const svg = d3.select(chartContainer)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .style("overflow", "visible");
    
    // X scale - use index for simplicity
    const x = d3.scaleLinear()
        .domain([0, displayData.length - 1])
        .range([margin.left, width - margin.right]);
    
    // Y scale - ensure stoploss and buy price are included in the domain
    const minY = Math.min(
        d3.min(displayData, d => d.low) * 0.99,
        stoplossPrice * 0.99
    );
    const maxY = Math.max(
        d3.max(displayData, d => d.high) * 1.01,
        buyPrice * 1.01
    );
    
    const y = d3.scaleLinear()
        .domain([minY, maxY])
        .range([height - margin.bottom, margin.top]);
    
    // Add line
    const line = d3.line()
        .x((d, i) => x(i))
        .y(d => y(d.close))
        .curve(d3.curveMonotoneX);
    
    // Draw line
    svg.append("path")
        .datum(displayData)
        .attr("fill", "none")
        .attr("stroke", "#2196F3")
        .attr("stroke-width", 2)
        .attr("d", line);
    
    // Add stoploss price line
    svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(stoplossPrice))
        .attr("y2", y(stoplossPrice))
        .attr("stroke", "#f44336")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,3");
    
    // Add buy price line
    svg.append("line")
        .attr("x1", margin.left)
        .attr("x2", width - margin.right)
        .attr("y1", y(buyPrice))
        .attr("y2", y(buyPrice))
        .attr("stroke", "#ff9800")
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "3,3");
    
    // Add invisible rect for mouse tracking
    svg.append("rect")
        .attr("width", width)
        .attr("height", height)
        .style("fill", "none")
        .style("pointer-events", "all")
        .on("click", () => {
            showFullScreenChart(symbol, stoplossPrice, buyPrice);
        });
    
    // Store chart instance reference
    chartInstances[symbol] = {
        chart: svg.node(),
        container: chartContainer
    };
}

// Show full screen chart popup
function showFullScreenChart(symbol, stoplossPrice, buyPrice) {
    console.log(`Showing full screen D3 chart for ${symbol}`);
    
    const popupContainer = document.querySelector('.chart-popup');
    const popupChartContainer = document.getElementById('popupChartContainer');
    const popupTitle = document.getElementById('popupChartTitle');
    
    if (!popupContainer || !popupChartContainer) {
        createChartPopup();
        return showFullScreenChart(symbol, stoplossPrice, buyPrice);
    }
    
    // Clear existing chart
    popupChartContainer.innerHTML = '';
    
    // Set popup title
    if (popupTitle) {
        popupTitle.textContent = `${symbol} Stock Chart`;
    }
    
    // Show popup
    popupContainer.style.display = 'flex';
    
    // Ensure close button works by reattaching the event listener
    const closeButton = document.querySelector('.chart-popup-close');
    if (closeButton) {
        // Remove any existing event listeners by cloning and replacing
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);
        
        // Add event listener to the new button
        newCloseButton.addEventListener('click', () => {
            popupContainer.style.display = 'none';
        });
    }
    
    // Find the stock data
    const stockData = stoplossStocks.find(stock => stock.symbol === symbol);
    if (!stockData) return;
    
    // Use the provided stoploss and buy price or get them from stockData
    stoplossPrice = stoplossPrice || stockData.stoplossPrice;
    buyPrice = buyPrice || stockData.buyPrice;
    
    // Check if we have data for this symbol
    if (!stockHistoricalData[symbol] || stockHistoricalData[symbol].length === 0) {
        const noDataLabel = document.createElement('div');
        noDataLabel.textContent = 'No data available';
        noDataLabel.style.position = 'absolute';
        noDataLabel.style.top = '50%';
        noDataLabel.style.left = '50%';
        noDataLabel.style.transform = 'translate(-50%, -50%)';
        noDataLabel.style.color = '#999';
        noDataLabel.style.fontSize = '16px';
        popupChartContainer.appendChild(noDataLabel);
        return;
    }
    
    // Process data - use more data points for full screen
    const data = stockHistoricalData[symbol];
    
    // Downsample for large datasets but keep more points for detailed view
    const displayData = downsampleData(data, 1000);
    
    // Wait for the popup to be visible
    setTimeout(() => {
        // Set up dimensions
        const width = popupChartContainer.clientWidth || 800;
        const height = popupChartContainer.clientHeight || 400;
        const margin = {top: 20, right: 80, bottom: 30, left: 50};
        
        // Create SVG
        const svg = d3.select(popupChartContainer)
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height]);
        
        // X scale - use index for simplicity
        const x = d3.scaleLinear()
            .domain([0, displayData.length - 1])
            .range([margin.left, width - margin.right]);
        
        // Y scale - ensure stoploss and buy price are included in the domain
        const minY = Math.min(
            d3.min(displayData, d => d.low) * 0.99,
            stoplossPrice * 0.99
        );
        const maxY = Math.max(
            d3.max(displayData, d => d.high) * 1.01,
            buyPrice * 1.01
        );
        
        const y = d3.scaleLinear()
            .domain([minY, maxY])
            .range([height - margin.bottom, margin.top]);
        
        // Add x-axis
        svg.append("g")
            .attr("transform", `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).ticks(5).tickFormat(i => {
                const index = Math.floor(i);
                if (index >= 0 && index < displayData.length) {
                    return index; // Or format as needed
                }
                return "";
            }));
        
        // Add y-axis
        svg.append("g")
            .attr("transform", `translate(${margin.left},0)`)
            .call(d3.axisLeft(y));
        
        // Add line
        const line = d3.line()
            .x((d, i) => x(i))
            .y(d => y(d.close))
            .curve(d3.curveMonotoneX);
        
        // Draw line
        svg.append("path")
            .datum(displayData)
            .attr("fill", "none")
            .attr("stroke", "#2196F3")
            .attr("stroke-width", 2)
            .attr("d", line);
        
        // Add candlestick (optional for detailed view)
        svg.selectAll("rect.candle")
            .data(displayData)
            .enter()
            .append("rect")
            .attr("class", "candle")
            .attr("x", (d, i) => x(i) - 2)
            .attr("y", d => y(Math.max(d.open, d.close)))
            .attr("width", 4)
            .attr("height", d => Math.abs(y(d.open) - y(d.close)))
            .attr("fill", d => d.open > d.close ? "#f44336" : "#4caf50");
        
        // Add stoploss price line
        svg.append("line")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", y(stoplossPrice))
            .attr("y2", y(stoplossPrice))
            .attr("stroke", "#f44336")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
        
        // Add stoploss price label
        svg.append("text")
            .attr("x", width - margin.right + 5)
            .attr("y", y(stoplossPrice) + 4)
            .attr("fill", "#f44336")
            .attr("font-size", "12px")
            .attr("text-anchor", "start")
            .text(`Stoploss: ${stoplossPrice.toFixed(2)}`);
        
        // Add buy price line
        svg.append("line")
            .attr("x1", margin.left)
            .attr("x2", width - margin.right)
            .attr("y1", y(buyPrice))
            .attr("y2", y(buyPrice))
            .attr("stroke", "#ff9800")
            .attr("stroke-width", 2)
            .attr("stroke-dasharray", "5,5");
        
        // Add buy price label
        svg.append("text")
            .attr("x", width - margin.right + 5)
            .attr("y", y(buyPrice) + 4)
            .attr("fill", "#ff9800")
            .attr("font-size", "12px")
            .attr("text-anchor", "start")
            .text(`Buy: ${buyPrice.toFixed(2)}`);
        
        // Store reference to destroy on close
        popupContainer.chart = svg.node();
    }, 100);
}

// Fetch historical data from the JSON file
async function fetchHistoricalData() {
    try {
        showLoading(true);
        const response = await fetch('/organized_nepse_data.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process the data
        processHistoricalData(data);
        
        showLoading(false);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        showError('Failed to load historical price data: ' + error.message);
        showLoading(false);
    }
}

// Process historical data
function processHistoricalData(data) {
    // Reset the historical data object
    stockHistoricalData = {};
    
    // Check if data is an array
    if (!Array.isArray(data)) {
        console.error("Data is not an array:", data);
        return;
    }
    
    // Create a more efficient data structure
    data.forEach(item => {
        // Extract the symbol
        const symbol = item.symbol;
        
        // Skip if missing data
        if (!symbol || item.open === undefined || item.high === undefined || 
            item.low === undefined || item.close === undefined) {
            return;
        }
        
        // Initialize array for this symbol if needed
        if (!stockHistoricalData[symbol]) {
            stockHistoricalData[symbol] = [];
        }
        
        // Add the data point
        stockHistoricalData[symbol].push({
            open: parseFloat(item.open),
            high: parseFloat(item.high),
            low: parseFloat(item.low),
            close: parseFloat(item.close)
        });
    });
}

function showError(message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = `<div class="error-message">${message}</div>`;
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

function showSuccess(message) {
    const messageContainer = document.getElementById('messageContainer');
    messageContainer.innerHTML = `<div class="success-message">${message}</div>`;
    setTimeout(() => {
        messageContainer.innerHTML = '';
    }, 5000);
}

function showLoading(show) {
    document.getElementById('loadingIndicator').style.display = show ? 'flex' : 'none';
}

// Add toggleWatchlist function to use the common version
function toggleWatchlist(symbol) {
    // Check if this is already processing a watchlist toggle
    if (toggleWatchlist._isProcessing) {
        return;
    }
    
    // Use the common reference if available
    if (typeof window.commonToggleWatchlist === 'function') {
        try {
            // Set flag to prevent recursive calls
            toggleWatchlist._isProcessing = true;
            
            // Call the common function
            window.commonToggleWatchlist(symbol);
        } finally {
            // Always clear the flag
            toggleWatchlist._isProcessing = false;
        }
        return;
    }
    
    // Fallback implementation if needed
    console.warn('Common watchlist functions not available. Please include common-watchlist.js');
}

// Initialize the recursion protection flag
toggleWatchlist._isProcessing = false;

function loadStoplossData() {
    showLoading(true);
    
    // Load bought stocks first
    loadBoughtStocks();
    
    // Fetch current prices and then process stoploss stocks
    fetchCurrentPrices().then(() => {
        // Update all stocks to include evaluation properties
        boughtStocks = boughtStocks.map(stock => {
            // Make sure every stock has current price data
            const currentPrice = currentPrices[stock.symbol] || (stock.buyPrice * 0.95);
            
            // Calculate or use existing stoploss price
            const defaultStoplossPercent = parseInt(document.getElementById('defaultStoplossPercent').value) || DEFAULT_STOPLOSS_PERCENT;
            const stoplossPrice = stock.stoplossPrice || (stock.buyPrice * (1 - defaultStoplossPercent / 100));
            
            // Force evaluation of stoploss status
            const isBroken = currentPrice <= stoplossPrice;
            
            return {
                ...stock,
                stoplossPrice: stoplossPrice,  // Ensure stoploss price exists
                ltp: currentPrice,             // Ensure current price exists 
                isBroken: isBroken             // Force evaluation of stoploss status
            };
        });
        
        // Save these enhanced stocks back to localStorage
        localStorage.setItem('boughtStocks', JSON.stringify(boughtStocks));
        
        // Process stoploss stocks with the enhanced data
        processStoplossStocks();
        
        // Show success message if stocks are found
        if (stoplossStocks.length > 0) {
            const watchlistParameter = new URLSearchParams(window.location.search).get('from_watchlist');
            if (watchlistParameter === 'true') {
                showSuccess(`Displaying ${stoplossStocks.length} stocks from your watchlist`);
            }
        } else if (boughtStocks.length === 0) {
            showError('No stocks found in Stoploss Tracker. Add stocks from Dashboard → Watchlist → Generate Order Code');
        }
        
        // Ensure watchlist is initialized after processing stocks
        if (typeof window.initWatchlist === 'function') {
            setTimeout(() => window.initWatchlist(), 100);
        }
        
        showLoading(false);
    }).catch(error => {
        console.error('Error loading stoploss data:', error);
        showError('Failed to load stoploss data');
        showLoading(false);
    });
}

function loadCurrentPrices() {
    return fetchCurrentPrices();
} 
