import { getState, subscribe, navigate } from '../store.js';
import { formatCurrency, formatNumber, formatDate } from '../utils/format.js';
import { getCurrentPortfolio } from '../store.js';
import { placeOrder, cancelOrder } from '../services/order-service.js';
import { getQuote } from '../services/market-data.js';
import { renderChart } from './chart.js';

let currentTab = 'overview';
let portfolioPrices = {};
let priceInterval = null;

export function renderPortfolioDetail(container) {
  const portfolio = getCurrentPortfolio();
  if (!portfolio) {
    navigate('portfolios');
    return;
  }

  container.innerHTML = '';

  // Header
  const header = document.createElement('div');
  header.className = 'header';
  header.innerHTML = `
    <span style="font-weight:600;font-size:14px">${portfolio.name}</span>
    <span class="muted" style="font-size:11px">${portfolio.baseCurrency} · ${portfolio.holdings.length} holdings</span>
    <div class="flex-1"></div>
    <div class="toolbar">
      <button id="pf-cash-btn">Cash</button>
      <button id="pf-order-btn" class="primary">+ Order</button>
      <button id="pf-settings-btn">Settings</button>
    </div>
  `;
  container.appendChild(header);

  // Stats bar
  const totalValue = portfolio.holdings.reduce((sum, h) => sum + h.shares * (portfolioPrices[h.symbol]?.price || h.avgCost), 0) + portfolio.cash;
  const stats = document.createElement('div');
  stats.className = 'stats-bar';
  stats.innerHTML = `
    <div class="stat">
      <div class="stat-label">Total Value</div>
      <div class="stat-value">${formatCurrency(totalValue, portfolio.baseCurrency)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Cash</div>
      <div class="stat-value">${formatCurrency(portfolio.cash, portfolio.baseCurrency)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Invested</div>
      <div class="stat-value">${formatCurrency(totalValue - portfolio.cash, portfolio.baseCurrency)}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Holdings</div>
      <div class="stat-value">${portfolio.holdings.length}</div>
    </div>
  `;
  container.appendChild(stats);

  // Tabs
  const tabs = document.createElement('div');
  tabs.className = 'tabs';

  const tabItems = ['overview', 'holdings', 'orders', 'trades', 'notes'];
  tabItems.forEach(t => {
    const tab = document.createElement('div');
    tab.className = 'tab' + (t === currentTab ? ' active' : '');
    tab.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    tab.onclick = () => {
      currentTab = t;
      renderPortfolioDetail(container);
    };
    tabs.appendChild(tab);
  });
  container.appendChild(tabs);

  // Content
  const content = document.createElement('div');
  content.className = 'content';
  content.id = 'pf-content';
  container.appendChild(content);

  renderTabContent(content, portfolio);

  // Header actions
  container.querySelector('#pf-cash-btn').onclick = () => showCashDialog(portfolio);
  container.querySelector('#pf-order-btn').onclick = () => showOrderDialog(portfolio);
  container.querySelector('#pf-settings-btn').onclick = () => showPortfolioSettings(portfolio);

  // Price polling
  if (priceInterval) clearInterval(priceInterval);
  if (portfolio.holdings.length > 0) {
    updatePrices(portfolio);
    priceInterval = setInterval(() => updatePrices(portfolio), 15000);
  }
}

async function updatePrices(portfolio) {
  for (const h of portfolio.holdings) {
    try {
      const quote = await getQuote(h.symbol);
      portfolioPrices[h.symbol] = quote;
    } catch {}
  }
  // Re-render if viewing this portfolio
  const overlay = document.querySelector('#pf-content');
  if (overlay) renderTabContent(overlay, getCurrentPortfolio());
}

function renderTabContent(container, portfolio) {
  container.innerHTML = '';

  switch (currentTab) {
    case 'overview':
      renderOverview(container, portfolio);
      break;
    case 'holdings':
      renderHoldings(container, portfolio);
      break;
    case 'orders':
      renderOrders(container, portfolio);
      break;
    case 'trades':
      renderTrades(container, portfolio);
      break;
    case 'notes':
      renderNotes(container, portfolio);
      break;
  }
}

function renderOverview(container, portfolio) {
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px';

  // Holdings panel
  const holdingsPanel = document.createElement('div');
  holdingsPanel.className = 'panel';
  holdingsPanel.innerHTML = `<div class="panel-header">Holdings</div>`;

  if (portfolio.holdings.length === 0) {
    holdingsPanel.innerHTML += `<div class="panel-body muted">No holdings. Place an order to start trading.</div>`;
  } else {
    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Symbol</th>
        <th class="text-right">Shares</th>
        <th class="text-right">Avg Cost</th>
        <th class="text-right">Market</th>
        <th class="text-right">Value</th>
      </tr></thead>
      <tbody>
        ${portfolio.holdings.map(h => {
          const price = portfolioPrices[h.symbol]?.price || h.avgCost;
          const value = h.shares * price;
          const change = price - h.avgCost;
          return `<tr>
            <td><strong>${h.symbol}</strong></td>
            <td class="text-right font-mono">${formatNumber(h.shares)}</td>
            <td class="text-right font-mono">${formatCurrency(h.avgCost, portfolio.baseCurrency)}</td>
            <td class="text-right font-mono">${formatCurrency(price, portfolio.baseCurrency)}</td>
            <td class="text-right font-mono ${change >= 0 ? 'up' : 'down'}">${formatCurrency(value, portfolio.baseCurrency)}</td>
          </tr>`;
        }).join('')}
      </tbody>
    `;
    holdingsPanel.appendChild(table);
  }
  grid.appendChild(holdingsPanel);

  // Chart panel
  const chartPanel = document.createElement('div');
  chartPanel.className = 'panel';
  chartPanel.innerHTML = `<div class="panel-header">Price Chart</div>`;
  const chartBody = document.createElement('div');
  chartBody.className = 'panel-body';
  chartBody.style.padding = '4px';
  chartPanel.appendChild(chartBody);
  grid.appendChild(chartPanel);

  container.appendChild(grid);

  // Render chart for first holding
  if (portfolio.holdings.length > 0) {
    renderChart(chartBody, portfolio.holdings[0].symbol);
  }
}

function renderHoldings(container, portfolio) {
  if (portfolio.holdings.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No holdings yet.</p></div>`;
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Symbol</th>
      <th>Name</th>
      <th class="text-right">Shares</th>
      <th class="text-right">Avg Cost</th>
      <th class="text-right">Market Price</th>
      <th class="text-right">Value</th>
      <th class="text-right">P&L</th>
      <th></th>
    </tr></thead>
    <tbody>
      ${portfolio.holdings.map(h => {
        const price = portfolioPrices[h.symbol]?.price || h.avgCost;
        const value = h.shares * price;
        const cost = h.shares * h.avgCost;
        const pl = value - cost;
        return `<tr>
          <td><strong>${h.symbol}</strong></td>
          <td class="muted">${h.symbol}</td>
          <td class="text-right font-mono">${formatNumber(h.shares)}</td>
          <td class="text-right font-mono">${formatCurrency(h.avgCost, portfolio.baseCurrency)}</td>
          <td class="text-right font-mono">${formatCurrency(price, portfolio.baseCurrency)}</td>
          <td class="text-right font-mono">${formatCurrency(value, portfolio.baseCurrency)}</td>
          <td class="text-right font-mono ${pl >= 0 ? 'up' : 'down'}">${formatCurrency(pl, portfolio.baseCurrency)}</td>
          <td><button class="sell-btn" data-symbol="${h.symbol}">Sell</button></td>
        </tr>`;
      }).join('')}
    </tbody>
  `;
  container.appendChild(table);

  table.querySelectorAll('.sell-btn').forEach(btn => {
    btn.onclick = () => showOrderDialog(portfolio, btn.dataset.symbol, 'sell');
  });
}

function renderOrders(container, portfolio) {
  const pending = portfolio.orders.filter(o => o.status === 'pending');
  const filled = portfolio.orders.filter(o => o.status !== 'pending');

  if (pending.length > 0) {
    const h3 = document.createElement('h3');
    h3.style.cssText = 'font-size:12px;margin-bottom:8px;color:var(--fg-dim)';
    h3.textContent = 'Pending Orders';
    container.appendChild(h3);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Date</th>
        <th>Symbol</th>
        <th>Action</th>
        <th>Type</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Price</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${pending.map(o => `<tr>
          <td class="muted">${formatDate(o.createdAt, 'YYYY-MM-DD HH:mm')}</td>
          <td><strong>${o.symbol}</strong></td>
          <td><span class="badge ${o.action === 'buy' || o.action === 'buy_to_cover' ? 'badge-green' : 'badge-red'}">${o.action.replace('_', ' ')}</span></td>
          <td>${o.type}</td>
          <td class="text-right font-mono">${o.quantity}</td>
          <td class="text-right font-mono">${o.price ? formatCurrency(o.price, portfolio.baseCurrency) : 'Market'}</td>
          <td><button class="cancel-order" data-id="${o.id}" style="font-size:10px">Cancel</button></td>
        </tr>`).join('')}
      </tbody>
    `;
    container.appendChild(table);

    table.querySelectorAll('.cancel-order').forEach(btn => {
      btn.onclick = async () => {
        await cancelOrder(portfolio.id, btn.dataset.id);
        renderPortfolioDetail(document.querySelector('#main-content'));
      };
    });
  }

  if (filled.length > 0) {
    const h3 = document.createElement('h3');
    h3.style.cssText = 'font-size:12px;margin:12px 0 8px;color:var(--fg-dim)';
    h3.textContent = 'Order History';
    container.appendChild(h3);

    const table = document.createElement('table');
    table.innerHTML = `
      <thead><tr>
        <th>Date</th>
        <th>Symbol</th>
        <th>Action</th>
        <th>Type</th>
        <th class="text-right">Qty</th>
        <th class="text-right">Filled</th>
        <th>Status</th>
      </tr></thead>
      <tbody>
        ${filled.slice(-50).reverse().map(o => `<tr>
          <td class="muted">${formatDate(o.createdAt, 'YYYY-MM-DD HH:mm')}</td>
          <td><strong>${o.symbol}</strong></td>
          <td>${o.action.replace('_', ' ')}</td>
          <td>${o.type}</td>
          <td class="text-right font-mono">${o.quantity}</td>
          <td class="text-right font-mono">${o.filledQuantity || 0}</td>
          <td><span class="badge ${o.status === 'filled' ? 'badge-green' : o.status === 'cancelled' ? 'badge-yellow' : 'badge-red'}">${o.status}</span></td>
        </tr>`).join('')}
      </tbody>
    `;
    container.appendChild(table);
  }

  if (portfolio.orders.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No orders yet.</p></div>`;
  }
}

function renderTrades(container, portfolio) {
  if (portfolio.trades.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No trades yet.</p></div>`;
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr>
      <th>Date</th>
      <th>Symbol</th>
      <th>Action</th>
      <th class="text-right">Shares</th>
      <th class="text-right">Price</th>
      <th class="text-right">Amount</th>
      <th class="text-right">Commission</th>
    </tr></thead>
    <tbody>
      ${portfolio.trades.slice().reverse().map(t => `<tr>
        <td class="muted">${formatDate(t.timestamp, 'YYYY-MM-DD HH:mm')}</td>
        <td><strong>${t.symbol}</strong></td>
        <td><span class="badge ${t.action === 'buy' || t.action === 'buy_to_cover' ? 'badge-green' : 'badge-red'}">${t.action.replace('_', ' ')}</span></td>
        <td class="text-right font-mono">${t.quantity}</td>
        <td class="text-right font-mono">${formatCurrency(t.price, portfolio.baseCurrency)}</td>
        <td class="text-right font-mono">${formatCurrency(t.grossAmount, portfolio.baseCurrency)}</td>
        <td class="text-right font-mono">${formatCurrency(t.commission, portfolio.baseCurrency)}</td>
      </tr>`).join('')}
    </tbody>
  `;
  container.appendChild(table);
}

function renderNotes(container, portfolio) {
  const textarea = document.createElement('textarea');
  textarea.className = 'notes-area';
  textarea.placeholder = 'Portfolio notes...';
  textarea.value = portfolio.notes || '';
  textarea.onchange = async () => {
    const { updatePortfolioNotes } = await import('../services/portfolio-service.js');
    await updatePortfolioNotes(portfolio.id, textarea.value);
  };
  container.appendChild(textarea);
}

function showCashDialog(portfolio) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>Manage Cash — ${portfolio.name}</span>
        <button class="close-modal" style="background:none;border:none;font-size:16px;cursor:pointer">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:12px">
          <div class="stat-value">${formatCurrency(portfolio.cash, portfolio.baseCurrency)}</div>
          <div class="stat-label">Current Cash Balance</div>
        </div>
        <div style="margin-bottom:8px">
          <label style="font-size:12px;color:var(--fg-dim);display:block;margin-bottom:4px">Amount</label>
          <input id="cash-amount" type="number" step="0.01" min="0" value="10000" style="width:100%" />
        </div>
      </div>
      <div class="modal-footer">
        <button id="cash-withdraw">Withdraw</button>
        <button id="cash-deposit" class="primary">Deposit</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.close-modal').onclick = () => overlay.remove();
  overlay.querySelector('#cash-deposit').onclick = async () => {
    const amount = parseFloat(overlay.querySelector('#cash-amount').value);
    if (!amount || amount <= 0) return;
    const { depositCash } = await import('../services/portfolio-service.js');
    await depositCash(portfolio.id, amount);
    overlay.remove();
    renderPortfolioDetail(document.querySelector('#main-content'));
  };
  overlay.querySelector('#cash-withdraw').onclick = async () => {
    const amount = parseFloat(overlay.querySelector('#cash-amount').value);
    if (!amount || amount <= 0) return;
    try {
      const { withdrawCash } = await import('../services/portfolio-service.js');
      await withdrawCash(portfolio.id, amount);
      overlay.remove();
      renderPortfolioDetail(document.querySelector('#main-content'));
    } catch (e) {
      alert(e.message);
    }
  };
}

function showOrderDialog(portfolio, preselectSymbol, preselectAction) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="min-width:450px">
      <div class="modal-header">
        <span>Place Order — ${portfolio.name}</span>
        <button class="close-modal" style="background:none;border:none;font-size:16px;cursor:pointer">×</button>
      </div>
      <div class="modal-body">
        <div class="order-form">
          <div class="full-width">
            <label>Symbol</label>
            <input id="order-symbol" type="text" value="${preselectSymbol || ''}" placeholder="AAPL" style="text-transform:uppercase;font-family:var(--font-mono)" />
          </div>
          <div>
            <label>Action</label>
            <select id="order-action">
              <option value="buy" ${preselectAction === 'buy' ? 'selected' : ''}>Buy</option>
              <option value="sell" ${preselectAction === 'sell' ? 'selected' : ''}>Sell</option>
              <option value="short_sell">Short Sell</option>
              <option value="buy_to_cover">Buy to Cover</option>
            </select>
          </div>
          <div>
            <label>Order Type</label>
            <select id="order-type">
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop Limit</option>
            </select>
          </div>
          <div>
            <label>Quantity</label>
            <input id="order-quantity" type="number" min="1" step="1" value="1" />
          </div>
          <div>
            <label>Limit Price</label>
            <input id="order-limit-price" type="number" step="0.01" placeholder="Optional" disabled />
          </div>
          <div>
            <label>Stop Price</label>
            <input id="order-stop-price" type="number" step="0.01" placeholder="Optional" disabled />
          </div>
          <div class="full-width" style="display:none" id="order-price-display">
            <label>Market Price</label>
            <span id="order-market-price" class="font-mono">—</span>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <span id="order-total" class="muted flex-1" style="font-size:11px;align-self:center"></span>
        <button id="order-cancel-btn">Cancel</button>
        <button id="order-submit" class="primary">Place Order</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const symbolInput = overlay.querySelector('#order-symbol');
  const typeSelect = overlay.querySelector('#order-type');
  const limitPrice = overlay.querySelector('#order-limit-price');
  const stopPrice = overlay.querySelector('#order-stop-price');
  const marketPriceDisplay = overlay.querySelector('#order-price-display');

  typeSelect.onchange = () => {
    limitPrice.disabled = typeSelect.value !== 'limit' && typeSelect.value !== 'stop_limit';
    stopPrice.disabled = typeSelect.value !== 'stop' && typeSelect.value !== 'stop_limit';
  };

  symbolInput.oninput = async () => {
    const sym = symbolInput.value.trim().toUpperCase();
    if (!sym) return;
    try {
      const quote = await getQuote(sym);
      marketPriceDisplay.style.display = 'block';
      overlay.querySelector('#order-market-price').textContent = `$${quote.price.toFixed(2)}`;
    } catch {}
  };

  overlay.querySelector('.close-modal').onclick = () => overlay.remove();
  overlay.querySelector('#order-cancel-btn').onclick = () => overlay.remove();
  overlay.querySelector('#order-submit').onclick = async () => {
    const symbol = symbolInput.value.trim().toUpperCase();
    const action = overlay.querySelector('#order-action').value;
    const type = typeSelect.value;
    const quantity = parseInt(overlay.querySelector('#order-quantity').value, 10);

    if (!symbol) { alert('Symbol required'); return; }
    if (!quantity || quantity <= 0) { alert('Invalid quantity'); return; }

    try {
      const quote = await getQuote(symbol);
      const order = {
        symbol,
        action,
        type,
        quantity,
        marketPrice: quote.price,
        price: type === 'limit' || type === 'stop_limit' ? parseFloat(limitPrice.value) : quote.price,
        stopPrice: type === 'stop' || type === 'stop_limit' ? parseFloat(stopPrice.value) : null,
        limitPrice: type === 'limit' || type === 'stop_limit' ? parseFloat(limitPrice.value) : null,
      };
      await placeOrder(portfolio.id, order);
      overlay.remove();
      renderPortfolioDetail(document.querySelector('#main-content'));
    } catch (e) {
      alert(e.message);
    }
  };

  if (preselectSymbol) symbolInput.dispatchEvent(new Event('input'));
}

function showPortfolioSettings(portfolio) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal" style="min-width:500px">
      <div class="modal-header">
        <span>Portfolio Settings — ${portfolio.name}</span>
        <button class="close-modal" style="background:none;border:none;font-size:16px;cursor:pointer">×</button>
      </div>
      <div class="modal-body">
        <div class="settings-group">
          <h3>General</h3>
          <div class="settings-row">
            <label>Name</label>
            <input id="ps-name" value="${portfolio.name}" />
          </div>
          <div class="settings-row">
            <label>Base Currency</label>
            <select id="ps-currency">
              ${['USD','EUR','GBP','JPY','CHF','CAD','AUD','SEK','NOK','SGD','HKD','KRW','INR','CNY','BRL'].map(c =>
                `<option value="${c}" ${c === portfolio.baseCurrency ? 'selected' : ''}>${c}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="settings-group">
          <h3>Commission</h3>
          <div class="settings-row">
            <label>Model</label>
            <select id="ps-commission-type">
              <option value="fixed" ${portfolio.settings.commissionModel.type === 'fixed' ? 'selected' : ''}>Fixed</option>
              <option value="percentage" ${portfolio.settings.commissionModel.type === 'percentage' ? 'selected' : ''}>Percentage</option>
              <option value="tiered" ${portfolio.settings.commissionModel.type === 'tiered' ? 'selected' : ''}>Tiered</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Commission Value</label>
            <input id="ps-commission-value" type="number" step="0.01" value="${portfolio.settings.commissionModel.value || 0}" />
          </div>
        </div>
        <div class="settings-group">
          <h3>Slippage</h3>
          <div class="settings-row">
            <label>Model</label>
            <select id="ps-slippage-type">
              <option value="fixed" ${portfolio.settings.slippage.type === 'fixed' ? 'selected' : ''}>Fixed</option>
              <option value="percentage" ${portfolio.settings.slippage.type === 'percentage' ? 'selected' : ''}>Percentage</option>
              <option value="random" ${portfolio.settings.slippage.type === 'random' ? 'selected' : ''}>Random</option>
            </select>
          </div>
          <div class="settings-row">
            <label>Slippage Value</label>
            <input id="ps-slippage-value" type="number" step="0.0001" value="${portfolio.settings.slippage.value || 0.001}" />
          </div>
        </div>
        <div class="settings-group">
          <h3>Execution</h3>
          <div class="settings-row">
            <label>Model</label>
            <select id="ps-execution">
              <option value="conservative" ${portfolio.settings.executionModel === 'conservative' ? 'selected' : ''}>Conservative</option>
              <option value="open" ${portfolio.settings.executionModel === 'open' ? 'selected' : ''}>Fill at Open</option>
              <option value="close" ${portfolio.settings.executionModel === 'close' ? 'selected' : ''}>Fill at Close</option>
              <option value="intrabar" ${portfolio.settings.executionModel === 'intrabar' ? 'selected' : ''}>Fill Intrabar</option>
            </select>
          </div>
        </div>
        <div class="settings-group">
          <h3>Risk</h3>
          <div class="settings-row">
            <label>Max Position Size</label>
            <input id="ps-max-pos" type="number" step="0.01" value="${portfolio.settings.maxPositionSize || 50000}" />
          </div>
          <div class="settings-row">
            <label>Max Exposure</label>
            <input id="ps-max-exp" type="number" step="0.01" min="0" max="1" value="${portfolio.settings.maxPortfolioExposure || 0.4}" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="ps-export" style="margin-right:auto">Export Portfolio</button>
        <button class="close-modal">Cancel</button>
        <button id="ps-save" class="primary">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#ps-export').onclick = async () => {
    const { exportPortfolio } = await import('../services/export-service.js');
    await exportPortfolio(portfolio.id);
  };

  overlay.querySelector('#ps-save').onclick = async () => {
    const name = overlay.querySelector('#ps-name').value;
    const { renamePortfolio, updatePortfolioSettings } = await import('../services/portfolio-service.js');
    if (name !== portfolio.name) await renamePortfolio(portfolio.id, name);
    await updatePortfolioSettings(portfolio.id, {
      commissionModel: {
        type: overlay.querySelector('#ps-commission-type').value,
        value: parseFloat(overlay.querySelector('#ps-commission-value').value) || 0,
      },
      slippage: {
        type: overlay.querySelector('#ps-slippage-type').value,
        value: parseFloat(overlay.querySelector('#ps-slippage-value').value) || 0.001,
      },
      executionModel: overlay.querySelector('#ps-execution').value,
      maxPositionSize: parseFloat(overlay.querySelector('#ps-max-pos').value) || 50000,
      maxPortfolioExposure: parseFloat(overlay.querySelector('#ps-max-exp').value) || 0.4,
    });
    overlay.remove();
    renderPortfolioDetail(document.querySelector('#main-content'));
  };

  overlay.querySelectorAll('.close-modal').forEach(el => {
    el.onclick = () => overlay.remove();
  });
}
