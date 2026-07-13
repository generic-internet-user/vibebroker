import type { EconomicEvent } from '../../types'

const BASE_URL = 'https://financialmodelingprep.com/stable'

function getKey(): string {
  return localStorage.getItem('fmp_api_key') || ''
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const s = String(value).replace(/[%$,\s]/g, '').replace(/[()]/g, '-')
  if (s === '' || s === 'N/A' || s === '-') return null
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export async function getEconomicCalendar(from: string, to: string): Promise<EconomicEvent[]> {
  const key = getKey()
  if (!key) throw new Error('FMP API key not configured')

  const url = `${BASE_URL}/economic-calendar?from=${from}&to=${to}&apikey=${key}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FMP economic calendar error: ${res.status}`)

  const data = await res.json()
  if (!Array.isArray(data)) {
    if (data && typeof data === 'object' && 'Error Message' in data) {
      throw new Error(`FMP: ${String((data as any)['Error Message'])}`)
    }
    return []
  }

  return data.map((e: any): EconomicEvent => ({
    date: e.date,
    event: e.event || e.name || '',
    country: e.country || '',
    impact: String(e.impact || 'low').toLowerCase(),
    period: e.period || '',
    source: 'FMP',
    actual: parseNumeric(e.actual),
    consensus: parseNumeric(e.forecast ?? e.consensus),
    previous: parseNumeric(e.previous),
  }))
}
