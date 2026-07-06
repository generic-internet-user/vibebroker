export const DB_NAME = 'vibebroker';
export const DB_VERSION = 1;

export const STORES = {
  PORTFOLIOS: 'portfolios',
  WATCHLISTS: 'watchlists',
  SETTINGS: 'settings',
  MARKET_CACHE: 'market_cache',
};

export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit',
};

export const ORDER_ACTIONS = {
  BUY: 'buy',
  SELL: 'sell',
  SHORT_SELL: 'short_sell',
  BUY_TO_COVER: 'buy_to_cover',
};

export const ORDER_STATUS = {
  PENDING: 'pending',
  FILLED: 'filled',
  PARTIALLY_FILLED: 'partially_filled',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
  REJECTED: 'rejected',
};

export const COMMISSION_MODELS = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  TIERED: 'tiered',
};

export const SLIPPAGE_MODELS = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
  RANDOM: 'random',
};

export const SPREAD_MODELS = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
};

export const EXECUTION_MODELS = {
  OPEN: 'open',
  CLOSE: 'close',
  INTRABAR: 'intrabar',
  CONSERVATIVE: 'conservative',
};

export const ASSET_CLASSES = {
  STOCK: 'stock',
  ETF: 'etf',
};

export const DEFAULT_SETTINGS = {
  commissionModel: { type: 'fixed', value: 0 },
  slippage: { type: 'percentage', value: 0.001 },
  spread: { type: 'percentage', value: 0.0005 },
  executionModel: 'conservative',
  defaultOrderSize: 1000,
  maxPositionSize: 50000,
  maxPortfolioExposure: 0.4,
  defaultStopLoss: null,
  defaultTakeProfit: null,
  riskEnforcementMode: 'hard',
  currencyConversionFee: 0.005,
  enableForking: true,
  enableUndoRedo: false,
  afterHoursTrading: false,
  theme: 'light',
  dateFormat: 'YYYY-MM-DD',
  numberFormat: 'en-US',
  timezone: 'UTC',
  baseCurrency: 'USD',
};

export const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
  'SEK', 'NOK', 'DKK', 'SGD', 'HKD', 'KRW', 'INR', 'CNY',
  'BRL', 'MXN', 'ZAR', 'TRY', 'PLN', 'CZK', 'ILS', 'TWD',
];

export const KEYBOARD_SHORTCUTS = {
  'b': 'Buy',
  's': 'Sell',
  'g g': 'Global search',
  'n': 'New portfolio',
  'o': 'New order',
  '?': 'Show keyboard reference',
};

export const MARKET_DATA_PROVIDERS = [
  {
    id: 'finnhub',
    name: 'Finnhub',
    requiresKey: true,
    url: 'https://finnhub.io/api/v1',
    website: 'https://finnhub.io',
    rateLimit: '60 req/min (free tier)',
    coverage: 'US stocks, ETFs, some international',
  },
  {
    id: 'alphavantage',
    name: 'Alpha Vantage',
    requiresKey: true,
    url: 'https://www.alphavantage.co/query',
    website: 'https://www.alphavantage.co',
    rateLimit: '5 req/min (free tier)',
    coverage: 'Global stocks, ETFs, forex, crypto',
  },
  {
    id: 'twelvedata',
    name: 'Twelve Data',
    requiresKey: true,
    url: 'https://api.twelvedata.com',
    website: 'https://twelvedata.com',
    rateLimit: '800 req/day (free tier)',
    coverage: 'Global stocks, ETFs, forex, crypto',
  },
];

export const CURRENCY_PROVIDERS = [
  {
    id: 'frankfurter',
    name: 'Frankfurter',
    requiresKey: false,
    url: 'https://api.frankfurter.app',
    website: 'https://www.frankfurter.app',
    rateLimit: 'No strict limit (free)',
    coverage: '180+ currencies',
  },
  {
    id: 'exchangerate',
    name: 'ExchangeRate-API',
    requiresKey: true,
    url: 'https://v6.exchangerate-api.com/v6',
    website: 'https://www.exchangerate-api.com',
    rateLimit: '1500 req/month (free tier)',
    coverage: '160+ currencies',
  },
];
