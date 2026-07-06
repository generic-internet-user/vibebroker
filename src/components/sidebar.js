import { getState, subscribe, navigate, setCurrentPortfolio } from '../store.js';

export function renderSidebar(container) {
  container.innerHTML = '';

  const header = document.createElement('div');
  header.className = 'sidebar-header';
  header.innerHTML = '<span>VibeBroker</span>';
  container.appendChild(header);

  function render() {
    const existing = container.querySelector('.sidebar-items');
    if (existing) existing.remove();

    const items = document.createElement('div');
    items.className = 'sidebar-items';

    const navSection = document.createElement('div');
    navSection.className = 'sidebar-section';

    const navItems = [
      { id: 'portfolios', label: 'Portfolios', icon: '▦' },
      { id: 'settings', label: 'Settings', icon: '⚙' },
    ];

    navItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'sidebar-item';
      el.innerHTML = `<span>${item.icon}</span><span>${item.label}</span>`;
      if (getState().view === item.id) el.classList.add('active');
      el.onclick = () => navigate(item.id);
      navSection.appendChild(el);
    });

    items.appendChild(navSection);

    const state = getState();
    const activePortfolios = state.portfolios.filter(p => !p.archived);

    if (activePortfolios.length > 0) {
      const ps = document.createElement('div');
      ps.className = 'sidebar-section';
      activePortfolios.forEach(p => {
        const el = document.createElement('div');
        el.className = 'sidebar-item';
        if (state.currentPortfolioId === p.id) el.classList.add('active');
        el.innerHTML = `<span style="color:var(--fg-muted)">○</span><span class="truncate">${p.name}</span>`;
        el.onclick = () => {
          setCurrentPortfolio(p.id);
          navigate('portfolio-detail');
        };
        ps.appendChild(el);
      });
      items.appendChild(ps);
    }

    container.appendChild(items);
  }

  subscribe('portfolios', render);
  subscribe('view', render);
  subscribe('currentPortfolioId', render);
  render();
}
