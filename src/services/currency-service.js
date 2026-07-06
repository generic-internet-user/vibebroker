import { getState } from '../store.js';
import { SUPPORTED_CURRENCIES } from '../utils/constants.js';

let ratesCache = null;
let ratesCacheTime = 0;
const CACHE_TTL = 3600 * 1000;

async function fetchFrankfurter() {
  const url = 'https://api.frankfurter.app/latest?base=USD';
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Frankfurter error: ${res.status}`);
  const data = await res.json();
  return { base: data.base, rates: data.rates, date: data.date };
}

async function fetchExchangeRate(key) {
  const url = `https://v6.exchangerate-api.com/v6/${key}/latest/USD`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ExchangeRate error: ${res.status}`);
  const data = await res.json();
  if (data.result !== 'success') throw new Error('ExchangeRate API error');
  return { base: 'USD', rates: data.conversion_rates };
}

export async function getRates() {
  if (ratesCache && Date.now() - ratesCacheTime < CACHE_TTL) {
    return ratesCache;
  }

  const { settings } = getState();
  let data;

  try {
    data = await fetchFrankfurter();
  } catch {
    const key = settings?.apiKeys?.exchangerate;
    if (key) {
      data = await fetchExchangeRate(key);
    } else {
      throw new Error('No currency API available. Configure ExchangeRate-API key for fallback.');
    }
  }

  ratesCache = data;
  ratesCacheTime = Date.now();
  return data;
}

export async function convertCurrency(amount, from, to) {
  if (from === to) return amount;
  const data = await getRates();
  const usdAmount = from === 'USD' ? amount : amount / (data.rates[from] || 1);
  const result = to === 'USD' ? usdAmount : usdAmount * (data.rates[to] || 1);
  return result;
}

export async function getSupportedCurrencies() {
  try {
    const data = await getRates();
    return ['USD', ...Object.keys(data.rates)].sort();
  } catch {
    return SUPPORTED_CURRENCIES;
  }
}
