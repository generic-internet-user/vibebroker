import { navigate } from '../store.js';

export function renderWelcome(container) {
  container.innerHTML = `
    <div class="empty-state">
      <h2>VibeBroker</h2>
      <p>Browser-based paper trading application</p>
      <div style="display:flex;gap:8px">
        <button class="primary" id="welcome-new-portfolio">New Portfolio</button>
        <button id="welcome-import">Import Data</button>
      </div>
    </div>
  `;

  container.querySelector('#welcome-new-portfolio').onclick = () => navigate('portfolios');
  container.querySelector('#welcome-import').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const { importData } = await import('../services/export-service.js');
        await importData(text);
        const { loadPortfolios } = await import('../store.js');
        await loadPortfolios();
        navigate('portfolios');
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  };
}
