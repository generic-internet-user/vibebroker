import type { Quote, OHLCV, Asset } from '../../types'

const BASE_URL = 'https://finnhub.io/api/v1'

function getKey(): string {
  return localStorage.getItem('finnhub_api_key') || ''
}

export async function getQuote(symbol: string): Promise<Quote> {
  const key = getKey()
  if (!key) throw new Error('Finnhub API key not configured')

  const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${key}`)
  if (!res.ok) throw new Error(`Finnhub quote error: ${res.status}`)

  const data = await res.json()
  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    timestamp: data.t * 1000,
  }
}

export async function getProfile(symbol: string): Promise<Asset | null> {
  const key = getKey()
  if (!key) throw new Error('Finnhub API key not configured')

  const res = await fetch(`${BASE_URL}/stock/profile2?symbol=${symbol}&token=${key}`)
  if (!res.ok) throw new Error(`Finnhub profile error: ${res.status}`)

  const data = await res.json()
  if (!data || !data.name) return null

  return {
    symbol: data.ticker,
    name: data.name,
    exchange: data.exchange,
    currency: data.currency || 'USD',
    type: data.finnhubIndustry === 'ETF' ? 'etf' : 'stock',
  }
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<OHLCV[]> {
  const key = getKey()
  if (!key) throw new Error('Finnhub API key not configured')

  const res = await fetch(
    `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=${resolution}&from=${from}&to=${to}&token=${key}`
  )
  if (!res.ok) throw new Error(`Finnhub candles error: ${res.status}`)

  const data = await res.json()
  if (data.s !== 'ok' || !Array.isArray(data.t)) return []

  return data.t.map((t: number, i: number) => ({
    timestamp: t * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i],
  }))
}

export async function searchSymbol(query: string): Promise<Asset[]> {
  const key = getKey()
  if (!key) throw new Error('Finnhub API key not configured')

  const res = await fetch(`${BASE_URL}/search?q=${query}&token=${key}`)
  if (!res.ok) throw new Error(`Finnhub search error: ${res.status}`)

  const data = await res.json()
  return (data.result || []).map((r: any) => ({
    symbol: r.symbol,
    name: r.description,
    exchange: r.exchange || '',
    currency: 'USD',
    type: r.type === 'ETF' ? 'etf' : 'stock',
  }))
}
