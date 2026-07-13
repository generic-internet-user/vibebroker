import { useState, useEffect, useCallback } from 'react'
import type { EarningsEvent, EconomicEvent } from '../types'
import * as marketData from '../lib/market-data'

type Tab = 'earnings' | 'economic'

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function defaultRange(): { from: string; to: string } {
  const to = new Date()
  to.setDate(to.getDate() + 30)
  const from = new Date()
  from.setDate(from.getDate() - 7)
  return { from: formatDate(from), to: formatDate(to) }
}

function impactClass(impact: string): string {
  if (impact === 'high') return 'text-negative'
  if (impact === 'medium') return 'text-warning'
  return 'text-muted'
}

function num(n: number | null): string {
  return n === null ? '—' : n.toLocaleString()
}

export function CalendarPanel() {
  const [tab, setTab] = useState<Tab>('earnings')
  const [range, setRange] = useState(defaultRange)
  const [earnings, setEarnings] = useState<EarningsEvent[]>([])
  const [economic, setEconomic] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loaded, setLoaded] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'earnings') {
        const data = await marketData.getEarningsCalendar(range.from, range.to)
        setEarnings(data)
      } else {
        const data = await marketData.getEconomicCalendar(range.from, range.to)
        setEconomic(data)
      }
      setLoaded(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }, [tab, range])

  useEffect(() => {
    setLoaded(false)
  }, [tab, range])

  const rows = tab === 'earnings' ? earnings : economic

  const keyHint = tab === 'earnings'
    ? 'Requires a Finnhub API key (free tier).'
    : 'Requires a Financial Modeling Prep API key (free tier).'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      <div className="flex items-center gap-1 mb-1" style={{ flexWrap: 'wrap' }}>
        <button
          className={`btn-sm ${tab === 'earnings' ? 'btn-primary' : ''}`}
          onClick={() => setTab('earnings')}
        >Earnings</button>
        <button
          className={`btn-sm ${tab === 'economic' ? 'btn-primary' : ''}`}
          onClick={() => setTab('economic')}
        >Economic</button>
        <span className="spacer" />
        <input
          type="date"
          value={range.from}
          onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
          style={{ height: 24, fontSize: 12 }}
        />
        <input
          type="date"
          value={range.to}
          onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
          style={{ height: 24, fontSize: 12 }}
        />
        <button className="btn-sm" onClick={fetchData}>Load</button>
      </div>

      {error && <div className="mb-1" style={{ color: 'var(--negative)' }}>{error}</div>}
      {loading && <div className="empty-state">Loading…</div>}
      {!loading && !error && loaded && rows.length === 0 && (
        <div className="empty-state">No events in range.</div>
      )}
      {!loaded && !loading && (
        <div className="empty-state">Configure a date range and press Load. {keyHint}</div>
      )}

      {loaded && !loading && rows.length > 0 && (
        <div style={{ overflow: 'auto', flex: 1 }}>
          {tab === 'earnings' ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Symbol</th>
                  <th>EPS Est</th>
                  <th>EPS Act</th>
                  <th>Rev Est</th>
                  <th>Rev Act</th>
                  <th>Time</th>
                  <th>Qtr</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e, i) => (
                  <tr key={`${e.symbol}-${e.date}-${i}`}>
                    <td className="mono">{e.date}</td>
                    <td className="mono font-bold">{e.symbol}</td>
                    <td className="mono">{num(e.epsEstimate)}</td>
                    <td className="mono">{num(e.epsActual)}</td>
                    <td className="mono">{num(e.revenueEstimate)}</td>
                    <td className="mono">{num(e.revenueActual)}</td>
                    <td>{e.hour}</td>
                    <td>{e.quarter ? `Q${e.quarter}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Country</th>
                  <th>Event</th>
                  <th>Impact</th>
                  <th>Period</th>
                  <th>Actual</th>
                  <th>Consensus</th>
                  <th>Previous</th>
                </tr>
              </thead>
              <tbody>
                {economic.map((e, i) => (
                  <tr key={`${e.event}-${e.date}-${e.country}-${i}`}>
                    <td className="mono">{e.date}</td>
                    <td>{e.country}</td>
                    <td>{e.event}</td>
                    <td className={impactClass(e.impact)}>{e.impact}</td>
                    <td>{e.period}</td>
                    <td className="mono">{num(e.actual)}</td>
                    <td className="mono">{num(e.consensus)}</td>
                    <td className="mono">{num(e.previous)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
