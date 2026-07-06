import { getState } from '../store.js';
import { STORES } from '../utils/constants.js';
import { getAll, put } from '../db.js';
import { formatDate } from '../utils/format.js';

export async function exportPortfolio(portfolioId) {
  const portfolio = await getAll(STORES.PORTFOLIOS);
  const p = portfolio.find(p => p.id === portfolioId);
  if (!p) throw new Error('Portfolio not found');
  const data = JSON.stringify(p, null, 2);
  downloadFile(data, `${p.name.replace(/[^a-zA-Z0-9]/g, '_')}_portfolio.json`, 'application/json');
  return data;
}

export async function exportAllData() {
  const portfolios = await getAll(STORES.PORTFOLIOS);
  const watchlists = await getAll(STORES.WATCHLISTS);
  const settings = await getAll(STORES.SETTINGS);

  const archive = {
    version: 1,
    exportedAt: Date.now(),
    data: {
      portfolios,
      watchlists,
      settings,
    },
  };

  const data = JSON.stringify(archive, null, 2);
  downloadFile(data, `vibebroker_backup_${formatDate(Date.now(), 'YYYY-MM-DD')}.json`, 'application/json');
  return archive;
}

export async function importData(jsonData) {
  let archive;
  if (typeof jsonData === 'string') {
    archive = JSON.parse(jsonData);
  } else {
    archive = jsonData;
  }

  if (archive.version !== 1 && archive.version !== undefined) {
    throw new Error('Unsupported data format version');
  }

  // If it's a single portfolio export (not an archive)
  if (archive.holdings !== undefined || archive.cash !== undefined) {
    await put(STORES.PORTFOLIOS, archive);
    return { portfolios: [archive], watchlists: [], settings: [] };
  }

  // Full archive
  const { portfolios, watchlists, settings } = archive.data || {};

  if (portfolios && Array.isArray(portfolios)) {
    for (const p of portfolios) {
      p.updatedAt = Date.now();
      await put(STORES.PORTFOLIOS, p);
    }
  }
  if (watchlists && Array.isArray(watchlists)) {
    for (const w of watchlists) {
      await put(STORES.WATCHLISTS, w);
    }
  }
  if (settings && Array.isArray(settings)) {
    for (const s of settings) {
      await put(STORES.SETTINGS, s);
    }
  }

  return { portfolios: portfolios || [], watchlists: watchlists || [], settings: settings || [] };
}

export async function exportBrokerCSV(portfolioId) {
  const portfolios = await getAll(STORES.PORTFOLIOS);
  const p = portfolios.find(p => p.id === portfolioId);
  if (!p) throw new Error('Portfolio not found');

  // Interactive Brokers (EU) style CSV
  const header = [
    'TradeDate', 'SettleDate', 'Symbol', 'ISIN', 'Currency',
    'Quantity', 'TradePrice', 'GrossAmount', 'Commission',
    'NetCash', 'Type', 'Exchange', 'AssetClass',
  ].join(',');

  const rows = p.trades.map(t => {
    const date = formatDate(t.timestamp, 'YYYY-MM-DD');
    const action = t.action === 'buy' ? 'BUY' : t.action === 'sell' ? 'SELL' : t.action === 'short_sell' ? 'SLD' : 'BTO';
    return [
      date, date, t.symbol, '',
      p.baseCurrency,
      (t.action === 'buy' || t.action === 'buy_to_cover' ? '' : '-') + t.quantity,
      t.price.toFixed(2),
      t.grossAmount.toFixed(2),
      t.commission.toFixed(2),
      (t.totalAmount * (t.action === 'buy' || t.action === 'buy_to_cover' ? -1 : 1)).toFixed(2),
      action, '', 'STK',
    ].join(',');
  });

  const csv = header + '\n' + rows.join('\n');
  downloadFile(csv, `${p.name.replace(/[^a-zA-Z0-9]/g, '_')}_trades.csv`, 'text/csv');
  return csv;
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
