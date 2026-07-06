import { savePortfolio, deletePortfolio as deletePort, getState, getCurrentPortfolio } from '../store.js';
import { uid, deepClone } from '../utils/helpers.js';
import { STORES, DEFAULT_SETTINGS } from '../utils/constants.js';
import { getAll, put, del } from '../db.js';

export async function createPortfolio({ name = 'New Portfolio', baseCurrency = 'USD', settings = {} } = {}) {
  const portfolio = {
    id: uid(),
    name,
    baseCurrency,
    cash: 0,
    holdings: [],
    orders: [],
    trades: [],
    notes: '',
    snapshots: [],
    settings: { ...deepClone(DEFAULT_SETTINGS), ...settings },
    createdAt: Date.now(),
    updatedAt: Date.now(),
    archived: false,
  };
  await savePortfolio(portfolio);
  return portfolio;
}

export async function renamePortfolio(id, name) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  portfolio.name = name;
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
}

export async function clonePortfolio(id, newName) {
  const original = await getPortfolio(id);
  if (!original) throw new Error('Portfolio not found');
  const clone = deepClone(original);
  clone.id = uid();
  clone.name = newName || `${original.name} (clone)`;
  clone.orders = [];
  clone.trades = [];
  clone.snapshots = [];
  clone.createdAt = Date.now();
  clone.updatedAt = Date.now();
  await savePortfolio(clone);
  return clone;
}

export async function archivePortfolio(id) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  portfolio.archived = !portfolio.archived;
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
}

export async function depositCash(id, amount, currency = null) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  if (currency && currency !== portfolio.baseCurrency) {
    const { convertCurrency } = await import('./currency-service.js');
    amount = await convertCurrency(amount, currency, portfolio.baseCurrency);
  }
  portfolio.cash += amount;
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
  return portfolio;
}

export async function withdrawCash(id, amount) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  if (amount > portfolio.cash) throw new Error('Insufficient cash');
  portfolio.cash -= amount;
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
  return portfolio;
}

export async function updatePortfolioNotes(id, notes) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  portfolio.notes = notes;
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
}

export async function updatePortfolioSettings(id, settings) {
  const portfolio = await getPortfolio(id);
  if (!portfolio) throw new Error('Portfolio not found');
  portfolio.settings = { ...portfolio.settings, ...settings };
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
}

export async function getPortfolio(id) {
  const { get } = await import('../db.js');
  return get(STORES.PORTFOLIOS, id);
}

// Snapshot for timeline forking
export async function forkPortfolio(id) {
  const original = await getPortfolio(id);
  if (!original) throw new Error('Portfolio not found');
  const fork = deepClone(original);
  fork.id = uid();
  fork.name = `${original.name} (fork ${new Date().toLocaleDateString()})`;
  fork.createdAt = Date.now();
  fork.updatedAt = Date.now();
  await savePortfolio(fork);
  return fork;
}
