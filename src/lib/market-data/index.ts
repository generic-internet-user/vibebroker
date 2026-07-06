import type { Quote, OHLCV, Asset, Provider, UseCase } from '../../types'
import * as finnhub from './finnhub'
import * as twelvedata from './twelvedata'
import * as yahoo from './yahoo'

const PROVIDER_MODULES: Record<Provider, { getQuote?: (s: string) => Promise<Quote>; getProfile?: (s: string) => Promise<Asset | null>; getCandles?: (s: string, r: string, f: number, t: number) => Promise<OHLCV[]>; searchSymbol?: (q: string) => Promise<Asset[]> }> = {
  finnhub,
  twelvedata,
  yahoo,
}

const DEFAULT_PRIORITY: Record<UseCase, Provider[]> = {
  quote: ['finnhub', 'twelvedata'],
  profile: ['finnhub', 'twelvedata'],
  candles: ['twelvedata', 'yahoo', 'finnhub'],
  search: ['finnhub', 'twelvedata'],
}

function getPriority(useCase: UseCase): Provider[] {
  try {
    const raw = localStorage.getItem('app_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.providerPriority?.[useCase]) {
        return parsed.providerPriority[useCase]
      }
    }
  } catch { }
  return DEFAULT_PRIORITY[useCase]
}

async function tryProviders<T>(
  useCase: UseCase,
  call: (provider: Provider) => Promise<T>
): Promise<T> {
  const providers = getPriority(useCase)
  let lastError: unknown

  for (const p of providers) {
    try {
      return await call(p)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error(`No provider available for ${useCase}`)
}

export async function getQuote(symbol: string): Promise<Quote> {
  return tryProviders('quote',
    (p) => PROVIDER_MODULES[p].getQuote!(symbol)
  )
}

export async function getProfile(symbol: string): Promise<Asset | null> {
  return tryProviders('profile',
    (p) => PROVIDER_MODULES[p].getProfile!(symbol)
  )
}

const RESOLUTION_TO_TD: Record<string, string> = {
  '1': '1min',
  '5': '5min',
  '15': '15min',
  '30': '30min',
  '60': '1h',
  'D': '1day',
  'W': '1week',
  'M': '1month',
}

function toTdInterval(resolution: string): string {
  return RESOLUTION_TO_TD[resolution] || resolution
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<OHLCV[]> {
  const tdInterval = toTdInterval(resolution)
  const tdStartDate = new Date(from * 1000).toISOString().split('T')[0]
  const tdEndDate = new Date(to * 1000).toISOString().split('T')[0]

  return tryProviders('candles', (p) => {
    if (p === 'twelvedata') {
      return twelvedata.getCandles(symbol, tdInterval, tdStartDate, tdEndDate)
    }
    return PROVIDER_MODULES[p].getCandles!(symbol, resolution, from, to)
  })
}

export async function searchSymbol(query: string): Promise<Asset[]> {
  return tryProviders('search',
    (p) => PROVIDER_MODULES[p].searchSymbol!(query)
  )
}
