import { navigate, getState, subscribe } from '../store.js';
import { renderSidebar } from './sidebar.js';
import { renderPortfolioList } from './portfolio-list.js';
import { renderPortfolioDetail } from './portfolio-detail.js';
import { renderSettingsPanel } from './settings-panel.js';
import { renderWelcome } from './welcome.js';

export function renderApp(container) {
  const layout = document.createElement('div');
  layout.className = 'layout';

  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.id = 'sidebar';

  const main = document.createElement('div');
  main.className = 'main';
  main.id = 'main-content';

  layout.appendChild(sidebar);
  layout.appendChild(main);
  container.appendChild(layout);

  renderSidebar(sidebar);

  subscribe('view', () => renderMain(main));
  subscribe('portfolios', () => {
    if (getState().view === 'portfolios' || getState().view === 'portfolio-detail') {
      renderMain(main);
    }
  });

  renderMain(main);
}

function renderMain(container) {
  const state = getState();
  container.innerHTML = '';

  switch (state.view) {
    case 'portfolios':
      container.innerHTML = '';
      renderPortfolioList(container);
      break;
    case 'portfolio-detail':
      renderPortfolioDetail(container);
      break;
    case 'settings':
      renderSettingsPanel(container);
      break;
    default:
      renderWelcome(container);
      break;
  }
}
