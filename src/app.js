import { initDB } from './db.js';
import { loadSettings, loadPortfolios, loadWatchlists, subscribe, getState, navigate } from './store.js';
import { renderApp } from './components/layout.js';
import { renderWatchlists } from './components/watchlist.js';
import { showSearch } from './components/search.js';
import { KEYBOARD_SHORTCUTS } from './utils/constants.js';

export async function initApp() {
  const appEl = document.getElementById('app');

  // Splash
  appEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--fg-muted);font-size:14px">Loading...</div>';

  try {
    await initDB();
    await loadSettings();
    await loadPortfolios();
    await loadWatchlists();
  } catch (e) {
    appEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--red)">Failed to initialize: ${e.message}</div>`;
    return;
  }

  appEl.innerHTML = '';
  renderApp(appEl);

  // Add watchlists view to navigation
  const nav = {
    ...subscribe_to_view(),
  };

  setupKeyboardShortcuts();

  // Autosave is handled by IndexedDB (each write is persistent)
  // Recovery will happen on reload since data persists
}

function subscribe_to_view() {
  subscribe('view', () => {
    // Re-render watchlist view if needed
  });
  return {};
}

function setupKeyboardShortcuts() {
  let keys = [];

  document.addEventListener('keydown', (e) => {
    // Don't intercept when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return;
    }

    const state = getState();

    switch (e.key) {
      case 'g':
        if (keys.length === 0 || keys[keys.length - 1] !== 'g') {
          keys.push('g');
          setTimeout(() => { keys = []; }, 500);
        } else {
          keys = [];
          showSearch();
        }
        e.preventDefault();
        break;
      case 'b':
        if (state.currentPortfolioId) {
          document.querySelector('#pf-order-btn')?.click();
        }
        e.preventDefault();
        break;
      case 's':
        if (state.currentPortfolioId) {
          // Quick sell - could improve
        }
        e.preventDefault();
        break;
      case 'n':
        navigate('portfolios');
        setTimeout(() => document.querySelector('#new-portfolio-btn')?.click(), 100);
        e.preventDefault();
        break;
      case 'o':
        if (state.currentPortfolioId) {
          document.querySelector('#pf-order-btn')?.click();
        }
        e.preventDefault();
        break;
      case '?':
        showKeyboardReference();
        e.preventDefault();
        break;
      case 'Escape':
        // Close modals
        document.querySelectorAll('.modal-overlay, .search-overlay, .kbd-ref').forEach(el => el.remove());
        break;
    }
  });
}

function showKeyboardReference() {
  const overlay = document.createElement('div');
  overlay.className = 'kbd-ref';
  overlay.innerHTML = `
    <div class="kbd-ref-inner">
      <div class="modal-header">
        <span>Keyboard Shortcuts</span>
        <button id="close-kbd" style="background:none;border:none;font-size:16px;cursor:pointer">×</button>
      </div>
      ${Object.entries(KEYBOARD_SHORTCUTS).map(([key, desc]) => `
        <div class="kbd-ref-row">
          <span>${desc}</span>
          <kbd>${key}</kbd>
        </div>
      `).join('')}
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#close-kbd').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}
