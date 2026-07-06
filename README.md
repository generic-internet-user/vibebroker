# VibeBroker

Local-first paper trading application for learning, experimentation, and strategy testing. Runs entirely in the browser with no server, no user accounts, and no database.

## Quick start

```bash
nix develop
npm run dev
```

Or without Nix:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Features

- **Portfolio management** – Create, rename, clone, archive, delete multiple independent portfolios
- **Paper trading** – Market, limit, stop, and stop-limit orders with commission, slippage, and spread simulation
- **Technical indicators** – SMA, EMA, VWAP, RSI, MACD, Bollinger Bands, ATR, Stochastic Oscillator
- **Watchlists** – Unlimited watchlists with live price tracking
- **Search** – Global search across symbols, companies, trades, and watchlists
- **Import/Export** – Full portfolio JSON archives and broker-like CSV trade exports
- **Risk management** – Configurable position size, exposure, stop-loss, and take-profit limits
- **Forking** – Save multiple independent simulation states
- **Keyboard shortcuts** – Buy, sell, search, and more
- **Dark mode** – Follows system preference

## External API dependencies

All API connections originate from your browser (client-side only). You must bring your own API keys:

| Data | Primary | Secondary |
|------|---------|-----------|
| Market data (quotes, candles, search) | [Finnhub](https://finnhub.io) (free tier: 60 req/min) | [Twelve Data](https://twelvedata.com) (free tier: 800 req/day) |
| Currency conversion | [Frankfurter](https://api.frankfurter.app) (no key needed, unlimited, ECB rates) | [ExchangeRate-API](https://exchangerate-api.com) (free tier: 1,500 req/month) |

Configure API keys in the Settings screen (keyboard: `?`).

## Architecture

- **Frontend**: React 19, TypeScript, Vite
- **Storage**: IndexedDB via Dexie.js (entirely in-browser)
- **Charts**: lightweight-charts (TradingView)
- **State**: React Context + useReducer
- **No server, no database, no telemetry**

## Project structure

```
src/
  types/          TypeScript type definitions
  db/             IndexedDB database layer
  lib/
    market-data/  API clients for Finnhub and Twelve Data
    currency/     Currency conversion (Frankfurter, ExchangeRate-API)
    trading/      Order execution engine, commissions, slippage
    indicators/   Technical indicator calculations
    export.ts     JSON/CSV import and export
  store/          React state management
  components/     UI components
  styles/         CSS
```

## License

GPLv2
