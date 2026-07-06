import type { OHLCV } from '../../types'

const BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

const RESOLUTION_TO_YAHOO: Record<string, string> = {
  '1': '1m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  'D': '1d',
  'W': '1wk',
  'M': '1mo',
}

export async function getCandles(
  symbol: string,
  resolution: string = 'D',
  from: number,
  to: number
): Promise<OHLCV[]> {
  const interval = RESOLUTION_TO_YAHOO[resolution] || '1d'

  const params = new URLSearchParams({
    period1: String(from),
    period2: String(to),
    interval,
  })

  const res = await fetch(`${BASE_URL}/${encodeURIComponent(symbol)}?${params}`)
  if (!res.ok) throw new Error(`Yahoo Finance chart error: ${res.status}`)

  const json = await res.json()
  const result = json.chart?.result?.[0]
  if (!result) return []

  const timestamps: number[] = result.timestamp || []
  const quote = result.indicators?.quote?.[0]
  if (!quote) return []

  return timestamps.map((t: number, i: number) => ({
    timestamp: t * 1000,
    open: quote.open[i] ?? 0,
    high: quote.high[i] ?? 0,
    low: quote.low[i] ?? 0,
    close: quote.close[i] ?? 0,
    volume: quote.volume[i] ?? 0,
  }))
}
