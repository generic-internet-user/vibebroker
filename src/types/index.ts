export interface Asset {
  symbol: string
  name: string
  exchange: string
  currency: string
  type: AssetType
}

export type AssetType = 'stock' | 'etf'

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  timestamp: number
}

export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type OrderType = 'market' | 'limit' | 'stop' | 'stop_limit'
export type OrderAction = 'buy' | 'sell' | 'short_sell' | 'buy_to_cover'
export type OrderStatus = 'pending' | 'filled' | 'partially_filled' | 'cancelled' | 'expired'

export interface Order {
  id: string
  portfolioId: string
  symbol: string
  type: OrderType
  action: OrderAction
  quantity: number
  price: number
  stopPrice?: number
  limitPrice?: number
  status: OrderStatus
  filledQuantity: number
  averageFillPrice: number
  commission: number
  slippage: number
  createdAt: number
  updatedAt: number
  notes?: string
  stopLoss?: number
  takeProfit?: number
}

export interface Position {
  symbol: string
  quantity: number
  averageCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  realizedPnL: number
  dayChange: number
  dayChangePercent: number
  asset: Asset
}

export interface Portfolio {
  id: string
  name: string
  baseCurrency: string
  cashBalance: number
  positions: Position[]
  orders: Order[]
  tradeHistory: Trade[]
  performanceHistory: PerformanceSnapshot[]
  notes: string
  settings: PortfolioSettings
  createdAt: number
  updatedAt: number
  archived: boolean
  parentId?: string
  forkNote?: string
}

export interface PortfolioSettings {
  commissionModel: CommissionModel
  slippageModel: SlippageModel
  spreadModel: SpreadModel
  executionModel: ExecutionModel
  defaultOrderSize: number
  maxPositionSize: number
  maxPortfolioExposure: number
  defaultStopLoss: number
  defaultTakeProfit: number
  enforceRiskLimits: boolean
  warningOnly: boolean
  currencyConversionFee: number
  partialFillEnabled: boolean
  enableForking: boolean
  enableUndoRedo: boolean
  undoWarningEnabled: boolean
}

export type CommissionModelType = 'fixed' | 'percentage' | 'tiered'

export interface CommissionModel {
  type: CommissionModelType
  fixedFee: number
  percentageFee: number
  tiers: CommissionTier[]
  minFee: number
  maxFee: number
}

export interface CommissionTier {
  minVolume: number
  maxVolume: number
  fee: number
  isPercentage: boolean
}

export type SlippageModelType = 'fixed' | 'percentage' | 'random'

export interface SlippageModel {
  type: SlippageModelType
  fixedSlippage: number
  percentageSlippage: number
  randomMin: number
  randomMax: number
}

export type SpreadModelType = 'fixed' | 'percentage'

export interface SpreadModel {
  type: SpreadModelType
  fixedSpread: number
  percentageSpread: number
}

export type ExecutionModel = 'open' | 'close' | 'intrabar' | 'conservative'

export interface Trade {
  id: string
  portfolioId: string
  orderId: string
  symbol: string
  action: OrderAction
  quantity: number
  price: number
  commission: number
  totalValue: number
  timestamp: number
  notes?: string
}

export interface PerformanceSnapshot {
  timestamp: number
  totalValue: number
  cashBalance: number
  positionsValue: number
  dailyPnL: number
  totalPnL: number
  totalReturn: number
}

export interface Watchlist {
  id: string
  name: string
  symbols: string[]
  notes: string
  sortOrder: number
  createdAt: number
  updatedAt: number
}

export interface IndicatorConfig {
  id: string
  type: IndicatorType
  enabled: boolean
  parameters: Record<string, number>
}

export type IndicatorType =
  | 'sma'
  | 'ema'
  | 'vwap'
  | 'rsi'
  | 'macd'
  | 'bollinger'
  | 'atr'
  | 'stochastic'

export interface IndicatorResult {
  timestamp: number
  value: number | [number, number] | [number, number, number]
}

import type { Provider, UseCase } from '../lib/market-data/registry'
export type { Provider, UseCase }

export interface AppSettings {
  theme: 'system' | 'light' | 'dark'
  dateFormat: string
  numberFormat: string
  timeZone: string
  defaultCurrency: string
  chartDefaults: ChartDefaults
  defaultSimulationSettings: PortfolioSettings
  globalCurrencyConversionFee: number
  searchDisabled: boolean
  searchDisabledCategories: string[]
  finnhubApiKey: string
  twelveDataApiKey: string
  exchangeRateApiKey: string
  enableForking: boolean
  enableUndoRedo: boolean
  undoWarningEnabled: boolean
  forkWarningEnabled: boolean
  pricePollingInterval: number
  providerPriority: Record<UseCase, Provider[]>
}

export interface ChartDefaults {
  chartStyle: 'candles' | 'line' | 'area' | 'bars'
  timeframe: string
  showVolume: boolean
  showGrid: boolean
}

export interface Snapshot {
  id: string
  portfolioId: string
  name: string
  data: Portfolio
  createdAt: number
}

export interface Fork {
  id: string
  sourcePortfolioId: string
  targetPortfolioId: string
  note: string
  createdAt: number
}

export interface UndoAction {
  id: string
  type: string
  timestamp: number
  description: string
  redo: () => void
  undo: () => void
}

export type PanelType = 'chart' | 'positions' | 'watchlists' | 'notes' | 'balance'

export interface LayoutPanel {
  id: string
  type: PanelType
  title: string
  symbol?: string
  x: number
  y: number
  width: number
  height: number
}

export const INDICATOR_COLORS = ['#4488ff', '#ff6d00', '#43a047', '#e53935', '#8e24aa', '#00acc1', '#ffb300', '#6d4c41']

export interface LayoutConfig {
  id: string
  name: string
  panels: LayoutPanel[]
}

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'YTD' | 'ALL'

export interface SearchResult {
  type: 'symbol' | 'company' | 'trade' | 'watchlist' | 'portfolio'
  label: string
  description: string
  id: string
  action: () => void
}
