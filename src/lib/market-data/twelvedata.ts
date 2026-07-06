import type { Quote, OHLCV, Asset } from '../../types'

const BASE_URL = 'https://api.twelvedata.com'

function getKey(): string {
  return localStorage.getItem('twelvedata_api_key') || ''
}

export async function getQuote(symbol: string): Promise<Quote> {
  const key = getKey()
  if (!key) throw new Error('Twelve Data API key not configured')

  const res = await fetch(
    `${BASE_URL}/quote?symbol=${symbol}&apikey=${key}`
  )
  if (!res.ok) throw new Error(`Twelve Data quote error: ${res.status}`)

  const data = await res.json()
  if (data.status === 'error') throw new Error(data.message || 'Twelve Data error')

  return {
    symbol: data.symbol,
    price: parseFloat(data.close || data.previous_close),
    change: parseFloat(data.change || '0'),
    changePercent: parseFloat(data.percent_change || '0'),
    high: parseFloat(data.high || '0'),
    low: parseFloat(data.low || '0'),
    open: parseFloat(data.open || '0'),
    previousClose: parseFloat(data.previous_close || '0'),
    timestamp: new Date(data.datetime || Date.now()).getTime(),
  }
}

export async function getProfile(symbol: string): Promise<Asset | null> {
  const key = getKey()
  if (!key) throw new Error('Twelve Data API key not configured')

  const res = await fetch(
    `${BASE_URL}/symbol_search?symbol=${symbol}&apikey=${key}`
  )
  if (!res.ok) throw new Error(`Twelve Data profile error: ${res.status}`)

  const data = await res.json()
  const item = data.data?.[0]
  if (!item) return null

  return {
    symbol: item.symbol,
    name: item.instrument_name || item.name || symbol,
    exchange: item.exchange || '',
    currency: item.currency || 'USD',
    type: item.instrument_type === 'ETF' || item.type === 'ETF' ? 'etf' : 'stock',
  }
}

export async function getCandles(
  symbol: string,
  interval: string = '1day',
  startDate?: string,
  endDate?: string
): Promise<OHLCV[]> {
  const key = getKey()
  if (!key) throw new Error('Twelve Data API key not configured')

  const params = new URLSearchParams({
    symbol,
    interval,
    apikey: key,
    outputsize: '5000',
  })
  if (startDate) params.set('start_date', startDate)
  if (endDate) params.set('end_date', endDate)

  const res = await fetch(
    `${BASE_URL}/time_series?${params.toString()}`
  )
  if (!res.ok) throw new Error(`Twelve Data candles error: ${res.status}`)

  const data = await res.json()
  if (!data.values) return []

  return data.values.map((v: any) => ({
    timestamp: new Date(v.datetime).getTime(),
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    volume: parseInt(v.volume || '0', 10),
  })).reverse()
}

export async function searchSymbol(query: string): Promise<Asset[]> {
  const key = getKey()
  if (!key) throw new Error('Twelve Data API key not configured')

  const res = await fetch(
    `${BASE_URL}/symbol_search?symbol=${query}&apikey=${key}`
  )
  if (!res.ok) throw new Error(`Twelve Data search error: ${res.status}`)

  const data = await res.json()
  return (data.data || []).map((r: any) => ({
    symbol: r.symbol,
    name: r.instrument_name || r.name || '',
    exchange: r.exchange || '',
    currency: r.currency || 'USD',
    type: r.instrument_type === 'ETF' ? 'etf' : 'stock',
  }))
}
