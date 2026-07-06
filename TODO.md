# VibeBroker — Roadmap

This file documents features planned for future iterations. When implementing a previously unimplemented feature listed here, agents should update `AGENTS.md` to reflect the new capability.

## Asset classes (not yet implemented)

- Crypto — requires different market data providers, 24/7 trading model, wallet tracking
- Forex — requires currency pair handling, pip-based pricing, rollover
- Futures — requires contract specifications, expiry, margin, settlement
- Options — requires Greeks, multi-leg strategies, expiry chains, assignment
- Commodities — requires futures-like handling with spot/futures basis
- Bonds — requires yield calculations, accrued interest, duration

These are non-goals for MVP. Design the data model and UI to accommodate them later without redesign.

## Features not yet built

### Data and analytics

- [ ] Stock screener (fundamental + technical filters)
- [ ] Heat map (sector/market visualization)
- [ ] Sector allocation visualization
- [ ] Trading calendar (exchange holidays, hours)
- [ ] Earnings calendar
- [ ] Economic calendar
- [ ] Custom indicators (for charts)
- [ ] Options chain viewer

### Trading and simulation

- [ ] Advanced order execution simulation (queue position, partial fills with config)
- [ ] Multi-leg strategies (covered calls, spreads, etc.)
- [ ] Backtesting engine (historical data replay)
- [ ] Monte Carlo simulations
- [ ] Portfolio optimization (Markowitz, etc.)
- [ ] Strategy scripting (in-browser DSL or JavaScript sandbox)

### Alerts

- [ ] Custom price alerts
- [ ] Technical indicator alerts
- [ ] News-based alerts
- [ ] Email/webhook notifications

### Timeline management

- [ ] Portfolio forking (save simulation state branches)
- [ ] Trade replay mode
- [ ] Replay bookmarks
- [ ] Session recording and statistics

### UI/UX

- [ ] Multi-monitor-friendly layouts
- [ ] Dockable panels
- [ ] Layout presets
- [ ] Trade annotations directly on charts
- [ ] Dark theme (CSS variables exist, actual theme toggle not implemented)

### Search

- [ ] Disable-able search categories (privacy/bandwidth-conscious users)
- [ ] Full order/trade text search

### Plugin system

- [ ] In-browser plugin architecture
- [ ] Custom indicator plugins
- [ ] AI-assisted trade journal analysis (BYOK LLM)

### Collaboration

- [ ] Collaborative portfolio sharing (explicitly opt-in)
- [ ] Shared watchlists

## Corporate actions

Architecture should anticipate:

- Mergers and acquisitions
- Spin-offs
- Delistings
- Symbol changes
- Dividends
- Stock splits

These are not yet implemented but should be supported by the data model.

## Non-goals (explicit)

- Telemetry or analytics of any kind
- User accounts or authentication
- Server-side databases
- Any form of KYC/AML
- Payment processing
- Real-money trading

## Implementation notes for future agents

When adding any feature from this TODO:

1. Update `AGENTS.md` to document the new capability
2. Ensure backward compatibility with existing data (versioned schema)
3. Add appropriate UI elements hidden behind feature flags in settings
4. Update `README.md` if external API dependencies change
5. Do NOT add any analytics, telemetry, or tracking code
