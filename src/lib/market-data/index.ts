import type { Quote, OHLCV, Asset } from '../../types'
import * as finnhub from './finnhub'
import * as twelvedata from './twelvedata'

export type Provider = 'finnhub' | 'twelvedata'

function activeProvider(): Provider {
  const finnhubKey = localStorage.getItem('finnhub_api_key')
  const twelvedataKey = localStorage.getItem('twelvedata_api_key')
  if (finnhubKey) return 'finnhub'
  if (twelvedataKey) return 'twelvedata'
  return 'finnhub'
}

function withFallback<T>(
  fn: (provider: Provider) => Promise<T>,
  fallbackFn: (provider: Provider) => Promise<T>
): Promise<T> {
  const primary = activeProvider()
  return fn(primary).catch(() => {
    const fallback: Provider = primary === 'finnhub' ? 'twelvedata' : 'finnhub'
    return fallbackFn(fallback)
  })
}

export async function getQuote(symbol: string): Promise<Quote> {
  return withFallback(
    (p) => (p === 'finnhub' ? finnhub.getQuote(symbol) : twelvedata.getQuote(symbol)),
    (p) => (p === 'finnhub' ? finnhub.getQuote(symbol) : twelvedata.getQuote(symbol))
  )
}

export async function getProfile(symbol: string): Promise<Asset | null> {
  return withFallback(
    (p) => (p === 'finnhub' ? finnhub.getProfile(symbol) : twelvedata.getProfile(symbol)),
    (p) => (p === 'finnhub' ? finnhub.getProfile(symbol) : twelvedata.getProfile(symbol))
  )
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<OHLCV[]> {
  return withFallback(
    (p) => (p === 'finnhub'
      ? finnhub.getCandles(symbol, resolution, from, to)
      : twelvedata.getCandles(symbol, resolution === 'D' ? '1day' : resolution)
    ),
    (p) => (p === 'finnhub'
      ? finnhub.getCandles(symbol, resolution, from, to)
      : twelvedata.getCandles(symbol, resolution === 'D' ? '1day' : resolution)
    )
  )
}

export async function searchSymbol(query: string): Promise<Asset[]> {
  const primary = activeProvider()
  try {
    return primary === 'finnhub'
      ? await finnhub.searchSymbol(query)
      : await twelvedata.searchSymbol(query)
  } catch {
    const fallback: Provider = primary === 'finnhub' ? 'twelvedata' : 'finnhub'
    return fallback === 'finnhub'
      ? finnhub.searchSymbol(query)
      : twelvedata.searchSymbol(query)
  }
}
