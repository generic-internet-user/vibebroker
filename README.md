# VibeBroker

Browser-based paper trading application for learning, experimentation, and strategy testing.

## Features

- **Portfolio management** — multiple independent portfolios with cash balances, holdings, trade history, and notes
- **Market data** — real-time quotes and historical prices via Finnhub, Alpha Vantage, or Twelve Data
- **Currency conversion** — automatic currency conversion via Frankfurter API (free, no key required)
- **Order types** — market, limit, stop, and stop-limit orders
- **Simulation** — configurable commission, slippage, spread, and execution models
- **Watchlists** — unlimited watchlists with live price tracking
- **Global search** — search symbols, companies, and portfolios
- **Export/Import** — full data export/import (JSON) and broker-style CSV exports
- **Keyboard shortcuts** — fast, keyboard-driven workflows
- **Local-first** — all data stored in your browser via IndexedDB

## Getting Started

### Via Nix

```sh
nix develop   # enters dev shell, runs npm install
npm run dev   # starts dev server on port 3000
```

### Without Nix

Requires Node.js 22+.

```sh
npm install
npm run dev
```

### Production build

```sh
npm run build     # outputs to dist/
npm run preview   # preview production build
```

## Architecture

VibeBroker is a client-side-only single-page application. There is no backend server. All data is stored locally in your browser's IndexedDB.

### External API dependencies

The browser connects directly to the following external APIs:

| Service | Purpose | Key Required | Free Tier |
|---|---|---|---|
| [Finnhub](https://finnhub.io) | Market data (quotes, history, search) | Yes | 60 req/min |
| [Alpha Vantage](https://www.alphavantage.co) | Market data (fallback) | Yes | 5 req/min |
| [Twelve Data](https://twelvedata.com) | Market data (fallback) | Yes | 800 req/day |
| [Frankfurter](https://www.frankfurter.app) | Currency conversion | No | No strict limit |
| [ExchangeRate-API](https://www.exchangerate-api.com) | Currency conversion (fallback) | Yes | 1500 req/month |

You can configure API keys in the Settings panel (no server-side storage — keys are saved to your browser's IndexedDB).

### Data flow

```
Browser (IndexedDB) ──► UI
     │
     ├──► Finnhub API (quotes, history, search)
     ├──► Alpha Vantage API (quotes, history)
     ├──► Frankfurter API (currency rates)
     └──► ExchangeRate-API (currency rates, fallback)
```

All API calls originate from the client. No data is sent to any server except the external APIs you configure.

## Usage

1. Open the app
2. Create a portfolio (Settings → New Portfolio or press `n`)
3. Configure API keys in Settings (at minimum, a Finnhub key for market data)
4. Deposit cash into your portfolio
5. Place trades
6. Track your performance

## License

GPLv2
