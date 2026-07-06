I want you to build a paper trading app intended for learning, experimentation, and strategy testing, with no specific requirements in regards to language (frontend or backend), architecture (this _is_ a vibe-coding experiment) or deployment model. It should be completely independent of any brokerage, require no user account, and utilize freely-available real-time market and currency data where possible. Assume the following required features:

# High-level goals
* No user accounts.
* No authentication.
* No KYC/AML.
* No payment information.
* No server-side database -- data should be stored in the user's browser.
* Fully functional as a web application.
* All user data is stored locally.
* Local-first architecture.
  - Cloud API dependencies on the client's side (i.e. browser connects to this API for real-time-ish market data and that API for... whatever else) are acceptable and indeed desired; make sure to document this in, at the very least, README.md.
* Fast, responsive UI -- think "that old $99 Atom laptop of mine with 4GB RAM and eMMC flash from 2015 -- obviously running some flavor of Linux since modern Windows would be a death sentence for the thing -- should be able to handle it reasonably well enough, assuming the browser is up-to-date", not that I intend on actively using it on that kind of hardware but...
  - As for UI style: I _distinctly_ dislike the "vibe-coded" website design "feel" seen in many AI-generated projects these days; avoid unnecessary shadows, pseudo-interactive CSS magic, rounded rectangles, or other mainstays of present-day LLM frontend design.
* No font dependencies, bundled or external; rely on browser/system fonts.

# Core features
## Portfolio management
Support multiple independent portfolios.

Each portfolio should contain:
* Cash balance
* Base currency
* Holdings
* Trade history
* Performance history
* Notes
* Custom settings

Allow:
* Creating
* Renaming
* Cloning
* Archiving
* Deleting portfolios

## Market and currency data
Research the current landscape for "sufficiently real-time I guess", "generous enough" free market data APIs (both current and historical) -- Finnhub comes to mind, but has limited asset coverage outside of US commodities on their free tier -- and make any outbound connections to said APIs come from the _client_, not server. For currency conversion, the same expectations apply. Implement support for at least two different API providers for each required data type.

APIs requiring key auth are acceptable if no other options exist; in such a scenario, build around a BYOK model (user signs up for API, generates key, pastes it into config screen) instead of storing one instance-wide key server-side.

If _truly_ desperate, it could theoretically be permissible for you to implement support for multiple APIs with the same purpose and a "load balancing" hack for rate-limit bypasses; this would, however, require intricate "timestamp clamping" logic to compensate for latency and other provider-specific factors, so it should be avoided unless absolutely necessary.

The app should, unless a future "time machine" mode gets implemented, *ALWAYS* assume *current market state*.

## Asset coverage
At this point in time (MVP stage), only implement support for stocks and ETFs. Design the product so that additional asset classes could later be added without redesigning the UI:
* Crypto
* Forex
* Futures
* Options
* Commodities
* Bonds

Each asset should include:
* Symbol
* Company/name
* Exchange
* Currency
* Historical price series
* Metadata

## Currency handling
Any newly created portfolio must start off as a blank slate with exactly 0 units of currency present; users should be expected to pre-load (or, later on, "bail out") their accounts with any desired amount of money.

The user must be able to create distinct portfolios denominated in any currency supported by the upstream API used by the app. Preconfigure "reasonable and realistic enough" currency conversion fees; this should be overridable per-portfolio or globally if so desired.

## Order management and emulation
Support realistic paper trading.

Order types:
* Market
* Limit
* Stop
* Stop-limit

Order actions:
* Buy
* Sell
* Short sell (optional but preferred)
* Buy to cover

Allow:
* Editing pending orders
* Cancelling pending orders

Support:
* Partial fills (configurable)
* Slippage simulation\*
* Commission simulation\*
* Exchange fees\*
* Configurable spread\*

\* Provide sane defaults.

## Scenario configuration
Simulation settings should include:

### Commission model
Examples:
* Fixed fee
* Percentage fee
* Tiered fee

### Slippage
* Fixed
* Percentage
* Random within configurable bounds

### Spread
* Fixed
* Percentage

### Execution assumptions:
* Fill at open
* Fill at close
* Fill intrabar
* Conservative fill model

Again, research and provide sane defaults.

## Watchlists
Users should be able to create unlimited watchlists.

Features:

* Add/remove symbols
* Search
* Sort
* Custom ordering
* Notes
* Multiple watchlists

## Technical Indicators
Support common indicators.
At minimum:
* SMA
* EMA
* VWAP
* RSI
* MACD
* Bollinger Bands
* ATR
* Stochastic Oscillator

Users should be able to:
* Enable/disable indicators
* Change parameters
* Save presets

## Data exports and imports
Support both:
* Complete portfolio archives, re-importable at any given point in time if needed. Can be JSON, or multiple ZIPped up JSON files, or whatever ends up suiting the architecture.
* "Broker-like" CSV exports for simulated accounting and tax work -- refer to whatever Interactive Brokers (EU) happens to be spitting out in their CSV exports at the moment as the example you should follow here.

For imports, assume that users _must_ be able to export their data, store it for a completely arbitrary amount of time, then reimport it at any given point in the future. Ensure that, upon a successful import, position value information must be valued in much the same way as if the user were to have closed the site and reopened it any length of time later, be it two minutes or two years.

## Risk Management
Allow configuring:
* Default order size
* Max position size
* Max portfolio exposure
* Default and per-order stop loss
* Default and per-order take profit

Enforce by default, implement "warning-only" mode as a toggle.

## Real-world scenario handling / Corporate actions
Architecture should anticipate future support for:
* Mergers
* Spin-offs
* Delistings
* Symbol changes

## Nice-to-have features
* Stock screener
* Heat map
* Sector allocation visualization
* Trading calendar
* Earnings calendar
* Economic calendar
* Custom alerts
* Price alerts
* Portfolio snapshots
* Replay bookmarks
* Trade replay mode
* Strategy comparison
* Multi-monitor-friendly layouts
* Dockable panels
* Layout presets
* Session recording
* Session statistics
* After-hours trading depending on upstream API support and exchange rules
* Trade annotations directly on charts

## User Experience
Prioritize:
* Minimal friction
* Keyboard-driven workflows
* Fast loading
* Smooth chart interactions
* No modal spam
* Autosave
* Recovery after browser crashes

## Timeline management (Forking)
Users should be able to save multiple independent simulation states, and to "fork" existing portfolio states into multiple separate ones.
Example:
> "What if I had bought instead?"

For those seeking a more "realistic" synthetic trading experience, it should be possible to disable forking and all UI elements related to it in the settings.

## Undo/Redo
Support undoing recent user actions when feasible. This should, however, bring up a loud, full-screen warning message by default (configurable in settings), and as with forking, it should be able to disable undo/redo entirely.

without destroying another timeline.

## Search
Fast global search.

Search:
* Symbols
* Company names
* Trades
* Watchlists

Searching for individual item categories, especially those that require hitting up online APIs, should be "disable-able" by the user if so desired (hardware, privacy or bandwidth constraints).

## Notes
Users should be able to write notes on:
* Portfolio
* Position
* Asset
* Trade

## Customization and internationalization
Include configurable:
* Currency
* Date format
* Number format
* Time zone
* Theme
* Chart defaults
* Default simulation settings

Default to browser i18n options by default (except for currency -- always default to USD), allow per-portfolio overrides. Do not support any UI languages besides US English.

## Keyboard shortcuts
Support common shortcuts (with an in-app reference) for:
* Buy
* Sell
* Search
* Pause
* Play
* Next candle
* Previous candle
* New order

## Future extensions
Design the application so that the following could be added later without requiring fundamental redesign:
* Options trading
* Multi-leg strategies
* Strategy scripting
* Backtesting engine
* Monte Carlo simulations
* Portfolio optimization
* Custom indicators
* Plugin system -- entirely in-browser
* AI-assisted trade journal analysis -- again, just like with other APIs, this would be BYOK for the LLM API
* Collaborative portfolio sharing (optional and explicitly opt-in)

# Non-goals
* Options or futures -- successfully and faithfully emulating these in a paper trading environment is _hard_, and properly auditing an AI-generated implementation of them would require knowledge that I do not have at this point in time
* Crypto -- will come later, but not yet
* Forex -- maybe someday
* Commodities -- again, maybe later, but not today.
* Telemetry or analytics -- this is, primarily, a single-user vibe coded project anyway, so not much point in including Google's or whoever's analytics/spyware payload here

# Environment
Assume a Nix-first agentic development workflow, with the primary entrypoint to the app (at least until the NixOS module gets added -- I am not really a "dev" person and am more familiar with Nix as a system configuration framework, with a full homelab migration being on the way; this will, at some point, run on what once used to be my Proxmox box) being the already-present `flake.nix` in the repo -- just `nix develop` should bring up a sufficiently fully-featured env for the app to be runnable -- hack up both the flake and `.gitignore` as needed.

# Deliverables
* "Should mostly work but the stuff you said you didn't want yet isn't there" implementation of the app itself
* Nix environment according to the aforementioned guidelines
* README.md -- just project info, no shields or AI-generated synthetic screenshots
* AGENTS.md based on project requirements and current best practices
* TODO.md outlining future goals and features -- basically all the "don't do this yet" stuff in this prompt
  - Make sure to direct agents to this file when needed (i.e. when a previously unimplemented feature gets wired in) through AGENTS.md.
* `.agents/skills/` directory structure including the following agent skills (refer to the current Agent Skills specification for further information):
  - `git-commit` - self-explanatory. Conventional commits, push by default.
  - `diff-review` - puts agent into reviewer role for either the current `git diff` or a specified commit/commit range.
  
This prompt has been saved to `./PROMPT.md`; once done, spawn a research subagent with a prompt referencing this file, with its job being to validate compliance with the requirements laid out in said prompt (i.e. the very prompt you're reading right now), then make any and all necessary improvements based on its insights. Commit-and-push your work along the way, piece by piece -- this is a hard requirement (do NOT make one giant commit at the end of it all). Keep track of your harness's todo infra instead of ticking the first item off, doing _literally everything_ at your own pace, then ticking everything off in bulk once you're done with implementing everything.
