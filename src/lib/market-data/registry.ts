import type { Quote, OHLCV, Asset } from '../../types'
import * as finnhub from './finnhub'
import * as twelvedata from './twelvedata'

interface ProviderApi {
  getQuote?: (symbol: string) => Promise<Quote>
  getProfile?: (symbol: string) => Promise<Asset | null>
  getCandles?: (symbol: string, resolution: string, from: number, to: number) => Promise<OHLCV[]>
  searchSymbol?: (query: string) => Promise<Asset[]>
}

export interface ProviderMeta {
  label: string
  note: string
}

export const PROVIDERS = {
  finnhub: {
    ...(finnhub as ProviderApi),
    label: 'Finnhub',
    note: 'Real-time quotes, 60 req/min free. No free candles.',
  },
  twelvedata: {
    ...(twelvedata as ProviderApi),
    label: 'Twelve Data',
    note: '800 candle req/day free, 8 req/min.',
  },
} as const satisfies Record<string, ProviderApi & ProviderMeta>

export type Provider = keyof typeof PROVIDERS
export type UseCase = 'quote' | 'profile' | 'candles' | 'search'

export const PROVIDER_LIST: Provider[] = Object.keys(PROVIDERS) as Provider[]

export const USECASE_LABELS: Record<UseCase, string> = {
  quote: 'Real-time Quotes',
  profile: 'Company Profiles',
  candles: 'Historical Candles',
  search: 'Symbol Search',
}

export const DEFAULT_PRIORITY: Record<UseCase, Provider[]> = {
  quote: ['finnhub', 'twelvedata'],
  profile: ['finnhub', 'twelvedata'],
  candles: ['twelvedata', 'finnhub'],
  search: ['finnhub', 'twelvedata'],
}
