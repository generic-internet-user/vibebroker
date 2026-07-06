# Agent guidelines for VibeBroker

## Project overview

VibeBroker is a local-first paper trading web application. All data lives in the user's browser (IndexedDB). No server, no accounts, no authentication. Architecture must remain compatible with future extensions listed in TODO.md.

## Tech stack

- **Language**: TypeScript (strict mode)
- **Framework**: React 19 with hooks, Context + useReducer for state
- **Build**: Vite 8
- **Storage**: Dexie.js (IndexedDB wrapper)
- **Charts**: lightweight-charts (TradingView)
- **Styling**: Plain CSS with CSS custom properties (system fonts only, no frameworks)

## Code conventions

- No comments in code unless the logic is truly non-obvious
- No shadows, no rounded corners, no CSS animations — flat design with borders
- System font stack only (`font-family: system-ui, ...`)
- Use `const` over `function` for component definitions
- One default export per module where possible
- All types in `src/types/index.ts`
- Import paths should be relative, no barrel imports beyond index files

## State management

- `AppContext` provides global state via `useApp()` hook
- State includes: portfolios, watchlists, settings, quotes cache
- Dispatch actions are defined in `src/store/AppContext.tsx`
- Portfolio mutations must write to IndexedDB then update context

## Adding features

1. Check TODO.md first — if the feature is listed there, it's planned
2. Update AGENTS.md if adding new conventions
3. Update README.md if adding new external dependencies
4. Update TODO.md if implementing something previously marked as future
5. Commit and push piece by piece — no monolithic commits

## Market data API priority

- Finnhub (primary, real-time US equities, generous free tier)
- Twelve Data (secondary, broader asset coverage)
- Frankfurter (currency, no key required)
- ExchangeRate-API (currency, broader currency support)
- All API keys are BYOK (Bring Your Own Key) — configured via Settings UI
- Keys stored in localStorage

## No-nos

- No user accounts or authentication
- No server-side code or databases
- No telemetry or analytics
- No external font dependencies
- No payment or KYC/AML
- No crypto, forex, futures, options, or commodities yet (see TODO.md)

## Agent skills reference

Skills are in `.agents/skills/`:
- `git-commit` – conventional commits with push
- `diff-review` – review current diff or specified commit range

Run `opencode` for available commands.
