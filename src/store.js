import { getAll, put, get } from './db.js';
import { STORES, DEFAULT_SETTINGS } from './utils/constants.js';

const listeners = new Map();
let state = {
  portfolios: [],
  currentPortfolioId: null,
  watchlists: [],
  settings: null,
  view: 'portfolios',
  searchQuery: '',
  marketData: new Map(),
  loading: false,
  error: null,
};

export function getState() {
  return state;
}

export function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key).delete(fn);
}

function notify(key) {
  const set = listeners.get(key);
  if (set) set.forEach(fn => fn(state));
}

function notifyAll() {
  for (const [key, set] of listeners) {
    set.forEach(fn => fn(state));
  }
}

export function setState(updates) {
  const prev = { ...state };
  state = { ...state, ...updates };

  for (const key of Object.keys(updates)) {
    notify(key);
  }
  notify('*');
}

// --- Settings ---

export async function loadSettings() {
  let settings = await get(STORES.SETTINGS, 'global');
  if (!settings) {
    settings = { id: 'global', ...JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) };
    await put(STORES.SETTINGS, settings);
  }
  state.settings = settings;
  notify('settings');
  return settings;
}

export async function updateSettings(updates) {
  const settings = { ...state.settings, ...updates };
  await put(STORES.SETTINGS, settings);
  state.settings = settings;
  notify('settings');
  return settings;
}

export function getSetting(key) {
  if (!state.settings) return DEFAULT_SETTINGS[key];
  return state.settings[key] !== undefined ? state.settings[key] : DEFAULT_SETTINGS[key];
}

// --- Portfolios ---

export async function loadPortfolios() {
  const portfolios = await getAll(STORES.PORTFOLIOS);
  state.portfolios = portfolios;
  notify('portfolios');
  return portfolios;
}

export async function savePortfolio(portfolio) {
  await put(STORES.PORTFOLIOS, portfolio);
  await loadPortfolios();
}

export async function deletePortfolio(id) {
  const { del } = await import('./db.js');
  await del(STORES.PORTFOLIOS, id);
  if (state.currentPortfolioId === id) {
    state.currentPortfolioId = null;
    notify('currentPortfolioId');
  }
  await loadPortfolios();
}

export function getCurrentPortfolio() {
  if (!state.currentPortfolioId) return null;
  return state.portfolios.find(p => p.id === state.currentPortfolioId) || null;
}

export function setCurrentPortfolio(id) {
  state.currentPortfolioId = id;
  notify('currentPortfolioId');
}

// --- Watchlists ---

export async function loadWatchlists() {
  const watchlists = await getAll(STORES.WATCHLISTS);
  state.watchlists = watchlists;
  notify('watchlists');
  return watchlists;
}

export async function saveWatchlist(watchlist) {
  await put(STORES.WATCHLISTS, watchlist);
  await loadWatchlists();
}

export async function deleteWatchlist(id) {
  const { del } = await import('./db.js');
  await del(STORES.WATCHLISTS, id);
  await loadWatchlists();
}

// --- View ---

export function navigate(view, params = {}) {
  state.view = view;
  state.viewParams = params;
  notify('view');
}
