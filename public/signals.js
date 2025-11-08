/**
 * Trading Signals Dashboard - Frontend JavaScript
 */

class SignalsDashboard {
    constructor() {
        this.signalsData = null;
        this.init();
    }

    async init() {
        await this.loadSignals();
        this.renderSignals();
        this.renderHistory();
        
        // Auto-refresh every 5 minutes
        setInterval(() => this.loadSignals(), 5 * 60 * 1000);
    }

    async loadSignals() {
        try {
            const response = await fetch('signals-database.json');
            if (!response.ok) {
                throw new Error('Failed to load signals database');
            }
            this.signalsData = await response.json();
            this.updateStats();
        } catch (error) {
            console.error('Error loading signals:', error);
            this.showError();
        }
    }

    updateStats() {
        if (!this.signalsData) return;

        // Update last update time
        const lastUpdate = document.getElementById('lastUpdate');
        if (this.signalsData.lastUpdated) {
            const date = new Date(this.signalsData.lastUpdated);
            lastUpdate.textContent = this.formatDateTime(date);
        } else {
            lastUpdate.textContent = 'Never';
        }

        // Update counts
        document.getElementById('buyCount').textContent = this.signalsData.currentBuySignals?.length || 0;
        document.getElementById('sellCount').textContent = this.signalsData.currentSellSignals?.length || 0;
    }

    renderSignals() {
        if (!this.signalsData) return;

        this.renderBuySignals();
        this.renderSellSignals();
    }

    renderBuySignals() {
        const container = document.getElementById('buySignals');
        const signals = this.signalsData.currentBuySignals || [];

        if (signals.length === 0) {
            container.innerHTML = `
                <div class="no-signals">
                    <div class="no-signals-icon">📭</div>
                    <div>No buy signals generated today</div>
                </div>
            `;
            return;
        }

        // Sort by date (most recent first)
        const sortedSignals = [...signals].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        container.innerHTML = sortedSignals.map(signal => this.createSignalCard(signal, 'buy')).join('');
    }

    renderSellSignals() {
        const container = document.getElementById('sellSignals');
        const signals = this.signalsData.currentSellSignals || [];

        if (signals.length === 0) {
            container.innerHTML = `
                <div class="no-signals">
                    <div class="no-signals-icon">📭</div>
                    <div>No sell signals generated today</div>
                </div>
            `;
            return;
        }

        // Sort by date (most recent first)
        const sortedSignals = [...signals].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        container.innerHTML = sortedSignals.map(signal => this.createSignalCard(signal, 'sell')).join('');
    }

    createSignalCard(signal, type) {
        const details = signal.details || {};
        const breakoutKey = type === 'buy' ? 'breakoutStrength' : 'breakdownStrength';
        const trendlineKey = type === 'buy' ? 'downtrendPrice' : 'uptrendPrice';

        return `
            <div class="signal-card ${type}">
                <div class="signal-header">
                    <div class="symbol">${signal.symbol}</div>
                    <div class="price">Rs. ${this.formatNumber(signal.price)}</div>
                </div>
                <div class="date-badge">
                    Signal Date: ${this.formatDate(signal.date)}
                </div>
                <div class="signal-details">
                    <div class="detail-item">
                        <div class="detail-label">RSI Fast</div>
                        <div class="detail-value">${details.rsiFast || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">RSI Slow</div>
                        <div class="detail-value">${details.rsiSlow || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Trendline Price</div>
                        <div class="detail-value">Rs. ${details[trendlineKey] || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">${type === 'buy' ? 'Breakout' : 'Breakdown'} Strength</div>
                        <div class="detail-value">${details[breakoutKey] || 'N/A'}%</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderHistory() {
        if (!this.signalsData || !this.signalsData.signalHistory) return;

        const tbody = document.getElementById('historyBody');
        const history = this.signalsData.signalHistory || [];

        if (history.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 30px; color: #718096;">
                        No historical data available
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by date (most recent first)
        const sortedHistory = [...history].sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });

        tbody.innerHTML = sortedHistory.map(entry => `
            <tr>
                <td><strong>${this.formatDate(entry.date)}</strong></td>
                <td>
                    <span class="badge badge-buy">${entry.buyCount || 0}</span>
                    ${this.renderStockList(entry.buySignals)}
                </td>
                <td>
                    <span class="badge badge-sell">${entry.sellCount || 0}</span>
                    ${this.renderStockList(entry.sellSignals)}
                </td>
                <td><strong>${(entry.buyCount || 0) + (entry.sellCount || 0)}</strong></td>
            </tr>
        `).join('');
    }

    renderStockList(signals) {
        if (!signals || signals.length === 0) return '';
        
        const stockNames = signals.slice(0, 5).map(s => s.symbol).join(', ');
        const remaining = signals.length > 5 ? ` +${signals.length - 5} more` : '';
        
        return `<div style="font-size: 0.85em; color: #718096; margin-top: 5px;">${stockNames}${remaining}</div>`;
    }

    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        
        // Handle format like "2024_05_06"
        const cleanDate = dateStr.replace(/_/g, '-');
        const date = new Date(cleanDate);
        
        if (isNaN(date.getTime())) return dateStr;
        
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    formatDateTime(date) {
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleString('en-US', options);
    }

    formatNumber(num) {
        if (typeof num !== 'number') return num;
        return num.toFixed(2);
    }

    showError() {
        const buyContainer = document.getElementById('buySignals');
        const sellContainer = document.getElementById('sellSignals');
        
        const errorHTML = `
            <div class="no-signals">
                <div class="no-signals-icon">⚠️</div>
                <div>Error loading signals. Please try again later.</div>
            </div>
        `;
        
        buyContainer.innerHTML = errorHTML;
        sellContainer.innerHTML = errorHTML;
        
        document.getElementById('lastUpdate').textContent = 'Error';
        document.getElementById('buyCount').textContent = '-';
        document.getElementById('sellCount').textContent = '-';
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SignalsDashboard();
});
