import { getState, subscribe, navigate, loadPortfolios } from '../store.js';
import { formatCurrency, formatDate } from '../utils/format.js';

export function renderPortfolioList(container) {
  const state = getState();

  container.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h1 style="font-size:16px;font-weight:600">Portfolios</h1>
      <div class="toolbar">
        <button id="new-portfolio-btn" class="primary">+ New Portfolio</button>
      </div>
    </div>
  `;

  const list = document.createElement('div');
  list.style.cssText = 'display:flex;flex-direction:column;gap:4px';

  const portfolios = state.portfolios.filter(p => !p.archived);

  if (portfolios.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <p>No portfolios yet. Create one to start paper trading.</p>
      </div>
    `;
  } else {
    portfolios.forEach(p => {
      const totalValue = p.holdings.reduce((sum, h) => sum + h.shares * h.avgCost, 0) + p.cash;
      const card = document.createElement('div');
      card.className = 'panel';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="panel-body" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:600;font-size:14px">${p.name}</div>
            <div class="muted text-sm">${p.holdings.length} holdings · ${p.orders.length} orders · ${p.trades.length} trades</div>
          </div>
          <div style="text-align:right">
            <div class="font-mono font-bold">${formatCurrency(totalValue, p.baseCurrency)}</div>
            <div class="muted text-sm">Cash: ${formatCurrency(p.cash, p.baseCurrency)}</div>
          </div>
        </div>
      `;
      card.onclick = () => {
        const { setCurrentPortfolio } = await_import_store();
        setCurrentPortfolio(p.id);
        navigate('portfolio-detail');
      };
      list.appendChild(card);
    });
  }

  container.appendChild(list);

  container.querySelector('#new-portfolio-btn').onclick = () => showNewPortfolioDialog();
}

async function await_import_store() {
  return await import('../store.js');
}

function showNewPortfolioDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <span>New Portfolio</span>
        <button id="close-modal" style="background:none;border:none;font-size:16px;cursor:pointer">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:8px">
          <label style="font-size:12px;color:var(--fg-dim);display:block;margin-bottom:4px">Portfolio Name</label>
          <input id="new-portfolio-name" type="text" value="My Portfolio" style="width:100%" />
        </div>
        <div style="margin-bottom:8px">
          <label style="font-size:12px;color:var(--fg-dim);display:block;margin-bottom:4px">Base Currency</label>
          <select id="new-portfolio-currency" style="width:100%">
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
            <option value="CHF">CHF</option>
            <option value="CAD">CAD</option>
            <option value="AUD">AUD</option>
            <option value="SEK">SEK</option>
            <option value="NOK">NOK</option>
            <option value="SGD">SGD</option>
            <option value="HKD">HKD</option>
            <option value="KRW">KRW</option>
            <option value="INR">INR</option>
            <option value="CNY">CNY</option>
            <option value="BRL">BRL</option>
          </select>
        </div>
      </div>
      <div class="modal-footer">
        <button id="cancel-new-portfolio">Cancel</button>
        <button id="confirm-new-portfolio" class="primary">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#close-modal').onclick = () => overlay.remove();
  overlay.querySelector('#cancel-new-portfolio').onclick = () => overlay.remove();
  overlay.querySelector('#confirm-new-portfolio').onclick = async () => {
    const name = overlay.querySelector('#new-portfolio-name').value.trim() || 'New Portfolio';
    const currency = overlay.querySelector('#new-portfolio-currency').value;
    const { createPortfolio } = await import('../services/portfolio-service.js');
    const p = await createPortfolio({ name, baseCurrency: currency });
    overlay.remove();
    const { setCurrentPortfolio } = await import('../store.js');
    setCurrentPortfolio(p.id);
    navigate('portfolio-detail');
  };

  overlay.querySelector('#new-portfolio-name').focus();
  overlay.querySelector('#new-portfolio-name').select();
}
