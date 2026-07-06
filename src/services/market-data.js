import { getState } from '../store.js';
import { STORES } from '../utils/constants.js';
import { get, put } from '../db.js';

const CACHE_TTL_QUOTE = 15 * 1000;
const CACHE_TTL_HISTORY = 3600 * 1000;

function getApiKey(providerId) {
  const { settings } = getState();
  if (!settings || !settings.apiKeys) return null;
  return settings.apiKeys[providerId] || null;
}

async function getFromCache(id) {
  const entry = await get(STORES.MARKET_CACHE, id);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > entry.ttl) return null;
  return entry.data;
}

async function setCache(id, data, ttl) {
  await put(STORES.MARKET_CACHE, { id, data, cachedAt: Date.now(), ttl });
}

// --- Finnhub ---
async function finnhubQuote(symbol) {
  const key = getApiKey('finnhub');
  if (!key) throw new Error('Finnhub API key not configured');
  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  const data = await res.json();
  return {
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t * 1000,
  };
}

async function finnhubProfile(symbol) {
  const key = getApiKey('finnhub');
  if (!key) throw new Error('Finnhub API key not configured');
  const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  return res.json();
}

// --- Alpha Vantage ---
async function alphavantageQuote(symbol) {
  const key = getApiKey('alphavantage');
  if (!key) throw new Error('Alpha Vantage API key not configured');
  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  const data = await res.json();
  const quote = data['Global Quote'];
  if (!quote) throw new Error('Symbol not found');
  return {
    price: parseFloat(quote['05. price']),
    change: parseFloat(quote['09. change']),
    changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
    high: parseFloat(quote['03. high']),
    low: parseFloat(quote['04. low']),
    open: parseFloat(quote['02. open']),
    previousClose: parseFloat(quote['08. previous close']),
    timestamp: Date.now(),
  };
}

// --- Twelve Data ---
async function twelvedataQuote(symbol) {
  const key = getApiKey('twelvedata');
  if (!key) throw new Error('Twelve Data API key not configured');
  const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Twelve Data error: ${res.status}`);
  const data = await res.json();
  if (data.status === 'error') throw new Error(data.message);
  return {
    price: parseFloat(data.close),
    change: parseFloat(data.change),
    changePercent: parseFloat(data.percent_change),
    high: parseFloat(data.high),
    low: parseFloat(data.low),
    open: parseFloat(data.open),
    previousClose: parseFloat(data.previous_close),
    timestamp: Date.now(),
  };
}

// --- Historical data ---
async function finnhubCandles(symbol, resolution = 'D', from, to) {
  const key = getApiKey('finnhub');
  if (!key) throw new Error('Finnhub API key not configured');
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub error: ${res.status}`);
  const data = await res.json();
  if (data.s === 'no_data') return [];
  return data.t.map((t, i) => ({
    timestamp: t * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i],
  }));
}

async function alphavantageDaily(symbol) {
  const key = getApiKey('alphavantage');
  if (!key) throw new Error('Alpha Vantage API key not configured');
  const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Alpha Vantage error: ${res.status}`);
  const data = await res.json();
  const series = data['Time Series (Daily)'];
  if (!series) throw new Error('No data available');
  return Object.entries(series).map(([date, values]) => ({
    timestamp: new Date(date).getTime(),
    open: parseFloat(values['1. open']),
    high: parseFloat(values['2. high']),
    low: parseFloat(values['3. low']),
    close: parseFloat(values['4. close']),
    volume: parseInt(values['5. volume'], 10),
  })).sort((a, b) => a.timestamp - b.timestamp);
}

// --- Public API ---

export async function getQuote(symbol, provider = 'finnhub') {
  const cacheKey = `quote:${symbol}:${provider}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  let data;
  switch (provider) {
    case 'finnhub':
      data = await finnhubQuote(symbol);
      break;
    case 'alphavantage':
      data = await alphavantageQuote(symbol);
      break;
    case 'twelvedata':
      data = await twelvedataQuote(symbol);
      break;
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  await setCache(cacheKey, data, CACHE_TTL_QUOTE);
  return data;
}

export async function getProfile(symbol) {
  const cacheKey = `profile:${symbol}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const data = await finnhubProfile(symbol);
  await setCache(cacheKey, data, CACHE_TTL_HISTORY);
  return data;
}

export async function getHistory(symbol, resolution = 'D', days = 365) {
  const cacheKey = `history:${symbol}:${resolution}:${days}`;
  const cached = await getFromCache(cacheKey);
  if (cached) return cached;

  const to = Math.floor(Date.now() / 1000);
  const from = to - days * 86400;

  let data;
  const key = getApiKey('finnhub');
  if (key) {
    data = await finnhubCandles(symbol, resolution, from, to);
  } else {
    const avKey = getApiKey('alphavantage');
    if (avKey) {
      data = await alphavantageDaily(symbol);
    } else {
      throw new Error('No market data API key configured. Add one in Settings.');
    }
  }

  await setCache(cacheKey, data, CACHE_TTL_HISTORY);
  return data;
}

export async function searchSymbols(query) {
  const key = getApiKey('finnhub');
  if (!key) return [];
  const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Search error: ${res.status}`);
  const data = await res.json();
  return (data.result || []).filter(r => r.type === 'Common Stock' || r.type === 'ETF').map(r => ({
    symbol: r.symbol,
    name: r.description,
    exchange: r.exchange,
    type: r.type === 'ETF' ? 'etf' : 'stock',
  }));
}
