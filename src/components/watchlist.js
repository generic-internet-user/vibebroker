import { getState, saveWatchlist, deleteWatchlist, navigate, subscribe } from '../store.js';
import { getQuote } from '../services/market-data.js';
import { formatCurrency } from '../utils/format.js';
import { uid } from '../utils/helpers.js';

let prices = {};
let priceInterval = null;

export function renderWatchlists(container) {
  container.innerHTML = '';

  const { watchlists, portfolios } = getState();

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-2';
  header.innerHTML = `
    <h1 style="font-size:16px;font-weight:600">Watchlists</h1>
    <button id="add-watchlist-btn" class="primary">+ New Watchlist</button>
  `;
  container.appendChild(header);

  if (watchlists.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<p>No watchlists yet. Create one to track symbols.</p>';
    container.appendChild(empty);
    return;
  }

  watchlists.forEach(w => {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.style.marginBottom = '8px';

    const panelHeader = document.createElement('div');
    panelHeader.className = 'panel-header';
    panelHeader.innerHTML = `
      <span>${w.name}</span>
      <div class="toolbar">
        <button class="add-symbol-btn" data-id="${w.id}">+ Add</button>
        <button class="delete-watchlist-btn" data-id="${w.id}" style="color:var(--red)">×</button>
      </div>
    `;
    panel.appendChild(panelHeader);

    const body = document.createElement('div');
    body.className = 'panel-body';
    body.style.padding = '0';

    if (!w.symbols || w.symbols.length === 0) {
      body.innerHTML = '<div class="muted" style="padding:12px;text-align:center">No symbols</div>';
    } else {
      w.symbols.forEach(sym => {
        const row = document.createElement('div');
        row.className = 'watchlist-symbol';
        const price = prices[sym];
        row.innerHTML = `
          <span class="sym">${sym}</span>
          <span class="name">${price ? '' : '—'}</span>
          <span class="price">${price ? formatCurrency(price.price, 'USD') : '...'}</span>
          <span class="change ${price ? (price.changePercent >= 0 ? 'up' : 'down') : ''}">${price ? (price.changePercent >= 0 ? '+' : '') + price.changePercent.toFixed(2) + '%' : ''}</span>
          <button class="remove-sym-btn" data-watchlist="${w.id}" data-symbol="${sym}" style="font-size:10px;padding:1px 4px;color:var(--red)">×</button>
        `;
        row.onclick = (e) => {
          if (e.target.closest('button')) return;
          const curP = getState().currentPortfolioId;
          if (curP) {
            const input = document.querySelector('#order-symbol');
            if (input) { input.value = sym; input.dispatchEvent(new Event('input')); }
            document.querySelector('#pf-order-btn')?.click();
          }
        };
        body.appendChild(row);
      });
    }
    panel.appendChild(body);
    container.appendChild(panel);

    panel.querySelector('.add-symbol-btn').onclick = () => addSymbolToWatchlist(w.id);
    panel.querySelector('.delete-watchlist-btn').onclick = async () => {
      if (confirm('Delete this watchlist?')) {
        await deleteWatchlist(w.id);
        renderWatchlists(container);
      }
    };
    panel.querySelectorAll('.remove-sym-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const wlId = btn.dataset.watchlist;
        const sym = btn.dataset.symbol;
        const wl = getState().watchlists.find(x => x.id === wlId);
        if (wl) {
          wl.symbols = wl.symbols.filter(s => s !== sym);
          await saveWatchlist(wl);
          renderWatchlists(container);
        }
      };
    });
  });

  container.querySelector('#add-watchlist-btn').onclick = () => {
    const name = prompt('Watchlist name:', 'New Watchlist');
    if (name) {
      const wl = { id: uid(), name, symbols: [], notes: '' };
      saveWatchlist(wl).then(() => renderWatchlists(container));
    }
  };

  // Start price polling
  if (priceInterval) clearInterval(priceInterval);
  const allSymbols = [...new Set(watchlists.flatMap(w => w.symbols || []))];
  if (allSymbols.length > 0) {
    updateWatchlistPrices(allSymbols);
    priceInterval = setInterval(() => updateWatchlistPrices(allSymbols), 30000);
  }
}

async function updateWatchlistPrices(symbols) {
  for (const sym of symbols) {
    try {
      const quote = await getQuote(sym);
      prices[sym] = quote;
    } catch {}
  }
  // Refresh display
  const mainContent = document.querySelector('#main-content');
  if (mainContent) {
    // Trigger re-render if on watchlists view
    const state = getState();
    if (state.view === 'watchlists') renderWatchlists(mainContent);
  }
}

async function addSymbolToWatchlist(watchlistId) {
  const sym = prompt('Enter symbol:');
  if (!sym) return;
  const wl = getState().watchlists.find(w => w.id === watchlistId);
  if (wl) {
    if (!wl.symbols) wl.symbols = [];
    if (!wl.symbols.includes(sym.toUpperCase())) {
      wl.symbols.push(sym.toUpperCase());
      await saveWatchlist(wl);
      renderWatchlists(document.querySelector('#main-content'));
    }
  }
}
