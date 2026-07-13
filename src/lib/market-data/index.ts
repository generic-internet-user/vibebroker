import type { Quote, OHLCV, Asset, EarningsEvent, EconomicEvent } from '../../types'
import type { Provider, UseCase } from './registry'
import { PROVIDERS, DEFAULT_PRIORITY, type ProviderApi } from './registry'
import * as twelvedata from './twelvedata'

function getPriority(useCase: UseCase): Provider[] {
  try {
    const raw = localStorage.getItem('app_settings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.providerPriority?.[useCase]) {
        return parsed.providerPriority[useCase].filter((p: string) => p in PROVIDERS)
      }
    }
  } catch { }
  return DEFAULT_PRIORITY[useCase]
}

async function tryProviders<T>(
  useCase: UseCase,
  capability: keyof ProviderApi,
  call: (provider: Provider) => Promise<T>,
): Promise<T> {
  const providers = getPriority(useCase).filter(
    (p) => typeof (PROVIDERS[p] as Record<string, unknown>)[capability as string] === 'function'
  )
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
  return tryProviders('quote', 'getQuote',
    (p) => PROVIDERS[p].getQuote!(symbol)
  )
}

export async function getProfile(symbol: string): Promise<Asset | null> {
  return tryProviders('profile', 'getProfile',
    (p) => PROVIDERS[p].getProfile!(symbol)
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

function toTradingDay(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  if (day === 0) d.setDate(d.getDate() - 2)
  else if (day === 6) d.setDate(d.getDate() - 1)
  return d
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<OHLCV[]> {
  const tdInterval = toTdInterval(resolution)
  const isIntraday = tdInterval.endsWith('min') || tdInterval.endsWith('h')
  const tdEndDate = toTradingDay(new Date(to * 1000)).toISOString().split('T')[0]
  let tdStartDate: string
  if (isIntraday) {
    const d = new Date(Math.min(from * 1000, to * 1000 - 7 * 86400 * 1000))
    tdStartDate = toTradingDay(d).toISOString().split('T')[0]
  } else {
    tdStartDate = toTradingDay(new Date(from * 1000)).toISOString().split('T')[0]
  }

  return tryProviders('candles', 'getCandles', (p) => {
    if (p === 'twelvedata') {
      return twelvedata.getCandles(symbol, tdInterval, tdStartDate, tdEndDate)
    }
    return PROVIDERS[p].getCandles!(symbol, resolution, from, to)
  })
}

export async function searchSymbol(query: string): Promise<Asset[]> {
  return tryProviders('search', 'searchSymbol',
    (p) => PROVIDERS[p].searchSymbol!(query)
  )
}

export async function getEarningsCalendar(from: string, to: string): Promise<EarningsEvent[]> {
  return tryProviders('earnings', 'getEarningsCalendar',
    (p) => PROVIDERS[p].getEarningsCalendar!(from, to)
  )
}

export async function getEconomicCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  return tryProviders('economic', 'getEconomicCalendar',
    (p) => PROVIDERS[p].getEconomicCalendar!(from, to)
  )
}
