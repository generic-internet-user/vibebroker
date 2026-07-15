# TODO

Future features and improvements planned for VibeBroker.

## Trading engine (status)

Implemented in the order-execution engine (`src/lib/trading/engine.ts`):

- [x] Real order types — market, limit, stop, and stop-limit now execute against live quotes (previously all orders filled instantly at the current price regardless of type)
- [x] Pending-order lifecycle — orders stay `pending` until their trigger condition is met by a quote; a price-poll loop (`processPendingOrders`) fills them over time
- [x] Cancel pending / partially-filled orders (Orders tab)
- [x] Partial fills — configurable; when enabled, non-market orders may fill in portions across polls
- [x] Short selling — short positions are modeled as signed quantities with a real liability; buy-to-cover and crossing long↔short are handled
- [x] FX conversion on trades — trade cost/proceeds are converted from the asset currency into the portfolio base currency (with a direction-aware conversion fee)
- [x] Slippage applied adversely for both buys and sells (previously only ever pushed prices up)
- [x] Buy-side cash check and sell-side holding check in risk validation
- [ ] Spread simulation — `SpreadModel` is configurable but not yet applied to fills
- [ ] Execution model (open/close/intrabar/conservative) — configured but not yet applied to fills
- [ ] Editing pending orders (price/stop/limit/qty) — cancel + resubmit works; in-place edit does not yet
- [ ] After-hours trading support
- [ ] Real-time WebSocket price streams (currently REST polling)
- [ ] Stop-loss / take-profit automation (fields are captured but no bracket/OCO logic yet)

## Account types

- [ ] Separate **cash** and **margin** account types — the `Portfolio` data model already carries `accountType: 'cash' | 'margin'` and a `realizedPnL` aggregate, but margin logic (buying power, leverage, maintenance) is not implemented yet. Cash accounts are the only behavior today.
- [ ] Fractional shares — order quantity is currently whole-share only (`parseInt` in the order form)

## Asset classes (not yet implemented)

- [ ] Crypto — multi-exchange, 24/7 trading
- [ ] Forex — currency pairs with live spreads
- [ ] Futures — contracts, margin, expiry
- [ ] Options — calls, puts, multi-leg strategies
- [ ] Commodities — gold, oil, etc.
- [ ] Bonds — government and corporate

## Core features

- [x] Chart component with TradingView lightweight-charts
- [x] Partial fills (configurable; enabled by default)
- [ ] Order editing for pending orders
- [ ] After-hours trading support
- [ ] Real-time WebSocket price streams
- [ ] Trade replay mode
- [ ] Performance history with charts (realized P&L is now aggregated; a time-series equity curve / snapshots are not yet recorded)
- [ ] Portfolio snapshots
- [ ] Session recording and statistics

## Technical indicators

- [x] Interactive chart overlay for indicators
- [ ] Indicator parameter customization UI
- [ ] Saved indicator presets

## Corporate actions

- [ ] Mergers
- [ ] Spin-offs
- [ ] Delistings
- [ ] Symbol changes

## Backtesting

- [ ] Time machine mode (historical data replay)
- [ ] Strategy scripting
- [ ] Monte Carlo simulations
- [ ] Portfolio optimization
- [ ] Strategy comparison

## UI

- [x] Resizable panels / modals
- [ ] News ticker / bottom bar widget (awaiting API integration)

## Nice-to-have

- [ ] Stock screener
- [ ] Heat map
- [ ] Sector allocation visualization
- [ ] Trading calendar
- [x] Earnings calendar
- [x] Economic calendar
- [ ] Custom alerts
- [ ] Price alerts
- [ ] Notes on positions, assets, and trades
- [x] Multi-monitor-ready layouts
- [x] Dockable panels
- [x] Layout presets
- [ ] Plugin system (in-browser)
- [ ] AI-assisted trade journal (BYOK LLM)
- [ ] Collaborative portfolio sharing (opt-in)
