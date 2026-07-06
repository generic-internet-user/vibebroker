import { searchSymbols } from '../services/market-data.js';
import { getState } from '../store.js';

let searchActive = false;

export function showSearch() {
  if (searchActive) return;
  searchActive = true;

  const overlay = document.createElement('div');
  overlay.className = 'search-overlay';
  overlay.id = 'global-search';
  overlay.innerHTML = `
    <div class="search-box">
      <input class="search-input" type="text" placeholder="Search symbols, companies, portfolios..." autofocus />
      <div class="search-results" id="search-results"></div>
      <div style="padding:6px 12px;border-top:1px solid var(--border-light);font-size:10px;color:var(--fg-muted)">
        Search local portfolios · API search for symbols
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const input = overlay.querySelector('.search-input');
  const resultsEl = overlay.querySelector('#search-results');

  let debounceTimer;

  input.oninput = () => {
    clearTimeout(debounceTimer);
    const q = input.value.trim();
    if (!q || q.length < 1) {
      resultsEl.innerHTML = '';
      return;
    }

    // Local portfolio search
    const state = getState();
    const localResults = state.portfolios.filter(p =>
      p.name.toLowerCase().includes(q.toLowerCase()) ||
      p.holdings.some(h => h.symbol.includes(q.toUpperCase()))
    );

    debounceTimer = setTimeout(async () => {
      let html = '';

      if (localResults.length > 0) {
        html += '<div class="search-result" style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.05em">Portfolios</div>';
        localResults.forEach(p => {
          html += `<div class="search-result" data-type="portfolio" data-id="${p.id}">
            <span style="color:var(--fg-muted)">○</span>
            <span class="name">${p.name}</span>
            <span class="muted">${p.holdings.length} holdings</span>
          </div>`;
        });
      }

      // API symbol search
      try {
        const symbols = await searchSymbols(q);
        if (symbols.length > 0) {
          html += '<div class="search-result" style="font-size:10px;color:var(--fg-muted);text-transform:uppercase;letter-spacing:0.05em">Symbols</div>';
          symbols.forEach(s => {
            html += `<div class="search-result" data-type="symbol" data-symbol="${s.symbol}">
              <span class="sym">${s.symbol}</span>
              <span class="name">${s.name}</span>
              <span class="muted">${s.exchange || ''}</span>
            </div>`;
          });
        }
      } catch {}

      if (!html) {
        html = '<div class="search-result" style="color:var(--fg-muted);justify-content:center">No results</div>';
      }

      resultsEl.innerHTML = html;

      resultsEl.querySelectorAll('.search-result[data-type]').forEach(el => {
        el.onclick = () => {
          const type = el.dataset.type;
          if (type === 'portfolio') {
            import('../store.js').then(m => {
              m.setCurrentPortfolio(el.dataset.id);
              m.navigate('portfolio-detail');
            });
            closeSearch();
          } else if (type === 'symbol') {
            const sym = el.dataset.symbol;
            const curPortfolio = getState().currentPortfolioId;
            if (curPortfolio) {
              showOrderForSymbol(sym);
            }
            closeSearch();
          }
        };
      });
    }, 300);
  };

  input.onkeydown = (e) => {
    if (e.key === 'Escape') closeSearch();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) closeSearch();
  };

  function closeSearch() {
    searchActive = false;
    overlay.remove();
  }
}

function showOrderForSymbol(symbol) {
  const { getCurrentPortfolio } = require_or_import_store();
  const portfolio = getCurrentPortfolio();
  if (portfolio) {
    // Import and show order dialog
    import('./portfolio-detail.js').then(m => {
      // Access showOrderDialog via a window export or just dispatch
      document.querySelector('#pf-order-btn')?.click();
      const symbolInput = document.querySelector('#order-symbol');
      if (symbolInput) {
        symbolInput.value = symbol;
        symbolInput.dispatchEvent(new Event('input'));
      }
    });
  }
}

function require_or_import_store() {
  // This is called from event handlers, so we inline the import
  return null;
}
