import { getState, updateSettings, navigate } from '../store.js';
import { MARKET_DATA_PROVIDERS, CURRENCY_PROVIDERS } from '../utils/constants.js';

export function renderSettingsPanel(container) {
  const settings = getState().settings;
  if (!settings) {
    container.innerHTML = '<div class="empty-state"><p>Loading settings...</p></div>';
    return;
  }

  container.innerHTML = `
    <div class="flex items-center justify-between mb-2">
      <h1 style="font-size:16px;font-weight:600">Settings</h1>
    </div>
    <div class="settings-form">
      <div class="settings-group">
        <h3>API Keys</h3>
        <p class="muted text-sm" style="margin-bottom:8px">
          Market data and currency APIs require API keys for most providers.
          Sign up for free tiers at the respective websites.
        </p>
        ${MARKET_DATA_PROVIDERS.map(p => `
          <div class="settings-row">
            <label>
              ${p.name}
              <span class="muted" style="font-weight:400;font-size:10px;display:block">
                <a href="${p.website}" target="_blank">${p.website}</a>
                · ${p.rateLimit}
              </span>
            </label>
            <input class="api-key-input" data-provider="${p.id}" type="password"
              placeholder="Enter API key"
              value="${(settings.apiKeys && settings.apiKeys[p.id]) || ''}" />
          </div>
        `).join('')}
        ${CURRENCY_PROVIDERS.filter(p => p.requiresKey).map(p => `
          <div class="settings-row">
            <label>
              ${p.name}
              <span class="muted" style="font-weight:400;font-size:10px;display:block">
                <a href="${p.website}" target="_blank">${p.website}</a>
                · ${p.rateLimit}
              </span>
            </label>
            <input class="api-key-input" data-provider="${p.id}" type="password"
              placeholder="Enter API key"
              value="${(settings.apiKeys && settings.apiKeys[p.id]) || ''}" />
          </div>
        `).join('')}
      </div>

      <div class="settings-group">
        <h3>Defaults</h3>
        <div class="settings-row">
          <label>Base Currency</label>
          <select id="set-base-currency">
            ${['USD','EUR','GBP','JPY','CHF','CAD','AUD','SEK','NOK','SGD','HKD','KRW','INR','CNY','BRL'].map(c =>
              `<option value="${c}" ${c === (settings.baseCurrency || 'USD') ? 'selected' : ''}>${c}</option>`
            ).join('')}
          </select>
        </div>
        <div class="settings-row">
          <label>Currency Conversion Fee</label>
          <input id="set-conv-fee" type="number" step="0.001" min="0" max="0.1"
            value="${settings.currencyConversionFee || 0.005}" />
        </div>
        <div class="settings-row">
          <label>Date Format</label>
          <select id="set-date-format">
            <option value="YYYY-MM-DD" ${settings.dateFormat === 'YYYY-MM-DD' ? 'selected' : ''}>YYYY-MM-DD</option>
            <option value="DD/MM/YYYY" ${settings.dateFormat === 'DD/MM/YYYY' ? 'selected' : ''}>DD/MM/YYYY</option>
            <option value="MM/DD/YYYY" ${settings.dateFormat === 'MM/DD/YYYY' ? 'selected' : ''}>MM/DD/YYYY</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Timezone</label>
          <select id="set-timezone">
            ${['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
              'Europe/London', 'Europe/Berlin', 'Europe/Moscow', 'Asia/Tokyo', 'Asia/Shanghai',
              'Asia/Hong_Kong', 'Asia/Singapore', 'Australia/Sydney'].map(tz =>
              `<option value="${tz}" ${tz === settings.timezone ? 'selected' : ''}>${tz}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>Simulation</h3>
        <div class="settings-row">
          <label>Default Order Size</label>
          <input id="set-order-size" type="number" step="1" value="${settings.defaultOrderSize || 1000}" />
        </div>
        <div class="settings-row">
          <label>Max Position Size</label>
          <input id="set-max-pos" type="number" step="1" value="${settings.maxPositionSize || 50000}" />
        </div>
        <div class="settings-row">
          <label>Max Portfolio Exposure</label>
          <input id="set-max-exp" type="number" step="0.01" min="0" max="1" value="${settings.maxPortfolioExposure || 0.4}" />
        </div>
        <div class="settings-row">
          <label>Risk Enforcement</label>
          <select id="set-risk-mode">
            <option value="hard" ${settings.riskEnforcementMode === 'hard' ? 'selected' : ''}>Hard (block orders)</option>
            <option value="warning" ${settings.riskEnforcementMode === 'warning' ? 'selected' : ''}>Warning only</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>Features</h3>
        <div class="settings-row">
          <label>Enable Forking</label>
          <select id="set-forking">
            <option value="true" ${settings.enableForking !== false ? 'selected' : ''}>Enabled</option>
            <option value="false" ${settings.enableForking === false ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
        <div class="settings-row">
          <label>Enable Undo/Redo</label>
          <select id="set-undo">
            <option value="true" ${settings.enableUndoRedo === true ? 'selected' : ''}>Enabled</option>
            <option value="false" ${settings.enableUndoRedo !== true ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
        <div class="settings-row">
          <label>After-Hours Trading</label>
          <select id="set-after-hours">
            <option value="true" ${settings.afterHoursTrading === true ? 'selected' : ''}>Enabled</option>
            <option value="false" ${settings.afterHoursTrading !== true ? 'selected' : ''}>Disabled</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3>Data Management</h3>
        <div class="settings-row">
          <label>Export All Data</label>
          <button id="export-all-btn">Download Backup</button>
        </div>
        <div class="settings-row">
          <label>Import Data</label>
          <button id="import-btn">Import File</button>
        </div>
        <div class="settings-row">
          <label>Clear All Data</label>
          <button id="clear-data-btn" class="danger">Clear Everything</button>
        </div>
      </div>

      <div style="margin-top:16px;display:flex;gap:8px">
        <button id="save-settings-btn" class="primary">Save Settings</button>
      </div>
    </div>
  `;

  container.querySelector('#save-settings-btn').onclick = async () => {
    const apiKeys = {};
    container.querySelectorAll('.api-key-input').forEach(input => {
      if (input.value) apiKeys[input.dataset.provider] = input.value;
    });

    await updateSettings({
      apiKeys,
      baseCurrency: container.querySelector('#set-base-currency').value,
      currencyConversionFee: parseFloat(container.querySelector('#set-conv-fee').value) || 0.005,
      dateFormat: container.querySelector('#set-date-format').value,
      timezone: container.querySelector('#set-timezone').value,
      defaultOrderSize: parseFloat(container.querySelector('#set-order-size').value) || 1000,
      maxPositionSize: parseFloat(container.querySelector('#set-max-pos').value) || 50000,
      maxPortfolioExposure: parseFloat(container.querySelector('#set-max-exp').value) || 0.4,
      riskEnforcementMode: container.querySelector('#set-risk-mode').value,
      enableForking: container.querySelector('#set-forking').value === 'true',
      enableUndoRedo: container.querySelector('#set-undo').value === 'true',
      afterHoursTrading: container.querySelector('#set-after-hours').value === 'true',
    });

    alert('Settings saved.');
  };

  container.querySelector('#export-all-btn').onclick = async () => {
    const { exportAllData } = await import('../services/export-service.js');
    await exportAllData();
  };

  container.querySelector('#import-btn').onclick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      try {
        const { importData } = await import('../services/export-service.js');
        const { loadPortfolios, loadWatchlists, loadSettings } = await import('../store.js');
        await importData(text);
        await loadPortfolios();
        await loadWatchlists();
        await loadSettings();
        alert('Data imported successfully.');
        renderSettingsPanel(document.querySelector('#main-content'));
      } catch (err) {
        alert('Import failed: ' + err.message);
      }
    };
    input.click();
  };

  container.querySelector('#clear-data-btn').onclick = async () => {
    if (!confirm('Are you sure? This will permanently delete ALL portfolios, watchlists, and settings.')) return;
    if (!confirm('This cannot be undone. Continue?')) return;
    const { clear, initDB } = await import('../db.js');
    const { STORES } = await import('../utils/constants.js');
    await clear(STORES.PORTFOLIOS);
    await clear(STORES.WATCHLISTS);
    await clear(STORES.SETTINGS);
    const { loadPortfolios, loadWatchlists, loadSettings } = await import('../store.js');
    await loadPortfolios();
    await loadWatchlists();
    await loadSettings();
    navigate('portfolios');
  };
}
