import type { Quote, OHLCV, Asset, EarningsEvent, EconomicEvent } from '../../types'
import * as finnhub from './finnhub'
import * as twelvedata from './twelvedata'
import * as fmp from './fmp'

interface ProviderApi {
  getQuote?: (symbol: string) => Promise<Quote>
  getProfile?: (symbol: string) => Promise<Asset | null>
  getCandles?: (symbol: string, resolution: string, from: number, to: number) => Promise<OHLCV[]>
  searchSymbol?: (query: string) => Promise<Asset[]>
  getEarningsCalendar?: (from: string, to: string) => Promise<EarningsEvent[]>
  getEconomicCalendar?: (from: string, to: string) => Promise<EconomicEvent[]>
}

export interface ProviderMeta {
  label: string
  note: string
}

export const PROVIDERS = {
  finnhub: {
    ...(finnhub as ProviderApi),
    label: 'Finnhub',
    note: 'Real-time quotes, 60 req/min free. Earnings calendar free; economic calendar is a paid add-on.',
  },
  twelvedata: {
    ...(twelvedata as ProviderApi),
    label: 'Twelve Data',
    note: '800 candle req/day free, 8 req/min.',
  },
  fmp: {
    ...(fmp as ProviderApi),
    label: 'Financial Modeling Prep',
    note: '250 req/day free. Economic calendar.',
  },
} as const satisfies Record<string, ProviderApi & ProviderMeta>

export type Provider = keyof typeof PROVIDERS
export type UseCase = 'quote' | 'profile' | 'candles' | 'search' | 'earnings' | 'economic'

export const PROVIDER_LIST: Provider[] = Object.keys(PROVIDERS) as Provider[]

export const USECASE_LABELS: Record<UseCase, string> = {
  quote: 'Real-time Quotes',
  profile: 'Company Profiles',
  candles: 'Historical Candles',
  search: 'Symbol Search',
  earnings: 'Earnings Calendar',
  economic: 'Economic Calendar',
}

export const DEFAULT_PRIORITY: Record<UseCase, Provider[]> = {
  quote: ['finnhub', 'twelvedata'],
  profile: ['finnhub', 'twelvedata'],
  candles: ['twelvedata', 'finnhub'],
  search: ['finnhub', 'twelvedata'],
  earnings: ['finnhub'],
  economic: ['fmp'],
}
