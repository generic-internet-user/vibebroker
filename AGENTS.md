# VibeBroker — Agent Guidelines

## Project overview

VibeBroker is a browser-based paper trading SPA. It uses vanilla JavaScript with Vite as the build tool. Data is persisted client-side via IndexedDB. All external API calls originate from the browser.

## Tech stack

- **Build tool**: Vite 6
- **Language**: Vanilla JavaScript (ES modules, no framework)
- **Storage**: IndexedDB (via direct API calls, no wrapper library)
- **Styles**: Plain CSS (system fonts, no preprocessors)
- **Charts**: HTML5 Canvas (custom implementation)
- **Node**: 22+

## Architecture

```
src/
├── index.js           # Entry point, imports styles and init
├── app.js             # App initialization, keyboard shortcuts
├── store.js           # State management (pub/sub pattern)
├── db.js              # IndexedDB abstraction layer
├── components/        # UI components (DOM-based rendering)
│   ├── layout.js
│   ├── sidebar.js
│   ├── welcome.js
│   ├── portfolio-list.js
│   ├── portfolio-detail.js
│   ├── chart.js
│   ├── search.js
│   ├── watchlist.js
│   └── settings-panel.js
├── services/          # Business logic
│   ├── portfolio-service.js
│   ├── order-service.js
│   ├── market-data.js
│   ├── currency-service.js
│   ├── export-service.js
│   └── simulation.js
├── utils/
│   ├── constants.js
│   ├── format.js
│   └── helpers.js
└── styles/
    ├── global.css
    └── components.css
```

## Design conventions

- **No rounded corners** (`--radius: 0`)
- **System fonts only** (no @font-face, no Google Fonts, no web font imports)
- **Flat design** (no shadows, no gradients, minimal CSS transitions)
- **No modal spam** — prefer inline actions over dialogs
- **Keyboard-first** — all major actions should have shortcuts
- **Minimal dependencies** — prefer browser APIs over libraries

## State management

The `store.js` module implements a simple pub/sub pattern:

- `getState()` — returns current state object
- `setState(updates)` — merges updates and notifies subscribers
- `subscribe(key, fn)` — subscribe to changes on a specific key or `'*'`
- Various async loaders — `loadPortfolios()`, `loadSettings()`, etc.

Components call `subscribe()` in their render functions to re-render on state changes. Never mutate state directly outside store functions.

## Data persistence

All data is persisted via IndexedDB. The `db.js` module provides a thin wrapper with `get`, `put`, `del`, `getAll`, `clear` operations.

Stores:
- `portfolios` — keyed by portfolio ID
- `watchlists` — keyed by watchlist ID
- `settings` — single document with ID `'global'`
- `market_cache` — cached API responses with TTL

## Adding features

### New asset class

1. Add the asset class to `ASSET_CLASSES` in `utils/constants.js`
2. Extend market data providers in `services/market-data.js` to support the new class
3. Add asset-class-specific fields to the portfolio holdings model
4. Update UI components to display the new class

### New API provider

1. Add provider config to `MARKET_DATA_PROVIDERS` or `CURRENCY_PROVIDERS` in `utils/constants.js`
2. Implement the provider function in the appropriate service file (e.g., `services/market-data.js`)
3. Add the provider to the selection logic (try/catch fallback chain)

### New order type

1. Add to `ORDER_TYPES` in `utils/constants.js`
2. Add execution logic in `services/order-service.js`
3. Update the UI order form in `portfolio-detail.js`

## Import/export compatibility

The data format uses a versioned JSON schema (`version: 1`). When changing the schema:

1. Increment the version number
2. Add migration logic in `export-service.js`
3. Update `TODO.md` if needed

## Feature flags

Settings in `store.settings` control feature availability:

- `enableForking` — enables/disables portfolio forking UI
- `enableUndoRedo` — enables/disables undo/redo
- `afterHoursTrading` — controls after-hours trading availability

Use these flags to hide UI elements rather than commenting code.

## When in doubt

- Read `TODO.md` for planned features and non-goals
- Read `README.md` for architecture and API dependencies
- Read `utils/constants.js` for all enums and configuration
- Check existing components for style and pattern consistency
