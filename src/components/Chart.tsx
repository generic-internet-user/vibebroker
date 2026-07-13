import { useEffect, useRef, useState, useCallback } from 'react'
import { createChart, CandlestickSeries, LineSeries, LineStyle, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { OHLCV, Timeframe, IndicatorType } from '../types'
import { INDICATOR_COLORS } from '../types'
import { useApp } from '../store/AppContext'
import * as marketData from '../lib/market-data'
import { calculateIndicator } from '../lib/indicators'

interface Props {
  symbol: string
  portfolioId?: string
  timeframe: Timeframe
  onTimeframeChange?: (tf: Timeframe) => void
  onSymbolChange?: (symbol: string) => void
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y', 'YTD', 'ALL']
const RESOLUTION_MAP: Record<string, string> = {
  '1D': '5',
  '1W': '30',
  '1M': '60',
  '3M': 'D',
  '1Y': 'D',
  'YTD': 'D',
  'ALL': 'D',
}

const INDICATOR_OPTIONS: IndicatorType[] = ['sma', 'ema', 'vwap', 'rsi', 'macd', 'bollinger', 'atr', 'stochastic']

function resolveCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888'
}

let colorIndex = 0
function nextColor(): string {
  return INDICATOR_COLORS[colorIndex++ % INDICATOR_COLORS.length]
}

export function Chart({ symbol, timeframe, onTimeframeChange, onSymbolChange }: Props) {
  const { state } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<'Line'>>>(new Map())
  const [data, setData] = useState<OHLCV[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabledIndicators, setEnabledIndicators] = useState<IndicatorType[]>([])
  const [indicatorParams, setIndicatorParams] = useState<Record<string, Record<string, number>>>({})
  const [showIndDropdown, setShowIndDropdown] = useState(false)
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false)

  useEffect(() => {
    if (!showSymbolDropdown) return
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.symbol-dropdown-wrapper')) {
        setShowSymbolDropdown(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showSymbolDropdown])

  useEffect(() => {
    if (!symbol || !containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      layout: {
        background: { color: 'transparent' },
        textColor: resolveCSSVar('--text-secondary'),
      },
      grid: {
        vertLines: { color: resolveCSSVar('--border-light') },
        horzLines: { color: resolveCSSVar('--border-light') },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: resolveCSSVar('--border'),
      },
      timeScale: {
        borderColor: resolveCSSVar('--border'),
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    })

    chartRef.current = chart
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: resolveCSSVar('--positive'),
      downColor: resolveCSSVar('--negative'),
      borderUpColor: resolveCSSVar('--positive'),
      borderDownColor: resolveCSSVar('--negative'),
      wickUpColor: resolveCSSVar('--positive'),
      wickDownColor: resolveCSSVar('--negative'),
    })
    candleSeriesRef.current = candleSeries

    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        if (chartRef.current) {
          chartRef.current.applyOptions({ width, height })
          chartRef.current.timeScale().fitContent()
        }
      }
    })
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      indicatorSeriesRef.current.clear()
    }
  }, [symbol])

  useEffect(() => {
    if (!chartRef.current) return
    const bg = resolveCSSVar('--bg-secondary')
    const text = resolveCSSVar('--text-secondary')
    const border = resolveCSSVar('--border')
    const borderLight = resolveCSSVar('--border-light')
    const positive = resolveCSSVar('--positive')
    const negative = resolveCSSVar('--negative')

    chartRef.current.applyOptions({
      layout: {
        background: { color: 'transparent' },
        textColor: text,
      },
      grid: {
        vertLines: { color: borderLight },
        horzLines: { color: borderLight },
      },
      rightPriceScale: { borderColor: border },
      timeScale: { borderColor: border },
    })
    if (candleSeriesRef.current) {
      candleSeriesRef.current.applyOptions({
        upColor: positive,
        downColor: negative,
        borderUpColor: positive,
        borderDownColor: negative,
        wickUpColor: positive,
        wickDownColor: negative,
      })
    }

  }, [state.settings.theme])

  useEffect(() => {
    if (!symbol) return
    setLoading(true)
    setData([])

    const fetchData = async () => {
      try {
        const now = Math.floor(Date.now() / 1000)
        let from: number
        const resolution = RESOLUTION_MAP[timeframe]
        if (timeframe === 'ALL') {
          from = 946684800 // Jan 1, 2000
        } else if (timeframe === 'YTD') {
          const d = new Date()
          from = Math.floor(new Date(d.getFullYear(), 0, 1).getTime() / 1000)
        } else {
          const range = { '1D': 1, '1W': 7, '1M': 30, '3M': 90, '1Y': 365 }[timeframe] || 365
          from = now - range * 86400
        }

        const candles = await marketData.getCandles(symbol, resolution, from, now)
        setData(candles)
        setLoading(false)
        setError(candles.length === 0 ? `No candle data for ${symbol}` : null)

        if (candleSeriesRef.current && candles.length > 0) {
          candleSeriesRef.current.setData(
            candles.map(c => ({
              time: (c.timestamp / 1000) as any,
              open: c.open,
              high: c.high,
              low: c.low,
              close: c.close,
            }))
          )
        }

        if (chartRef.current && candles.length > 0) {
          chartRef.current.timeScale().fitContent()
        }
      } catch (err) {
        setLoading(false)
        setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    fetchData()
  }, [symbol, timeframe])

  useEffect(() => {
    if (!candleSeriesRef.current || data.length === 0) return

    for (const [, series] of indicatorSeriesRef.current) {
      chartRef.current?.removeSeries(series)
    }
    indicatorSeriesRef.current.clear()

    if (enabledIndicators.length === 0) return

    colorIndex = 0

    for (const indicator of enabledIndicators) {
      const params = indicatorParams[indicator] || {}
      const results = calculateIndicator(indicator as any, data, params)
      if (results.length === 0) continue

      const color = nextColor()
      const toTime = (r: typeof results[0]) => (r.timestamp / 1000) as any

      function addLine(key: string, c: string, lineData: { time: any; value: number }[], dashed = false) {
        const series = chartRef.current!.addSeries(LineSeries, {
          color: c,
          lineWidth: 1,
          lineStyle: dashed ? LineStyle.Dashed : LineStyle.Solid,
          lastValueVisible: false,
          priceLineVisible: false,
        })
        series.setData(lineData)
        indicatorSeriesRef.current.set(key, series)
      }

      const firstVal = results[0].value

      if (typeof firstVal === 'number') {
        addLine(indicator, color, results.map(r => ({ time: toTime(r), value: r.value })))
      } else if (firstVal.length === 3) {
        if (indicator === 'bollinger') {
          addLine(`${indicator}_mid_${color}`, color, results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[1] })))
          addLine(`${indicator}_upper_${color}`, color, results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[2] })), true)
          addLine(`${indicator}_lower_${color}`, color, results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[0] })), true)
        } else {
          addLine(`${indicator}_line_${color}`, color, results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[0] })))
          addLine(`${indicator}_signal_${color}`, '#FF6D00', results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[1] })))
          addLine(`${indicator}_hist_${color}`, '#43A047', results.map(r => ({ time: toTime(r), value: (r.value as [number, number, number])[2] })))
        }
      } else if (firstVal.length === 2) {
        addLine(`${indicator}_k_${color}`, color, results.map(r => ({ time: toTime(r), value: (r.value as [number, number])[0] })))
        addLine(`${indicator}_d_${color}`, '#FF6D00', results.map(r => ({ time: toTime(r), value: (r.value as [number, number])[1] })))
      }
    }
  }, [enabledIndicators, indicatorParams, data])

  const [symbolSearch, setSymbolSearch] = useState('')

  const toggleIndicator = useCallback((type: IndicatorType) => {
    setEnabledIndicators(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }, [])

  const portfolioSymbols = state.portfolios
    .flatMap(p => p.positions)
    .map(p => p.symbol)
    .filter((s, i, a) => a.indexOf(s) === i)

  const filteredSymbols = portfolioSymbols.filter(s =>
    s.toLowerCase().includes(symbolSearch.toLowerCase())
  )

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center gap-2 mb-1" style={{ minHeight: 28 }}>
        <div className="symbol-dropdown-wrapper">
          <button
            className="btn-sm mono"
            onClick={() => { setShowSymbolDropdown(v => !v); setSymbolSearch('') }}
          >
            {symbol} ▾
          </button>
          {showSymbolDropdown && (
            <div className="symbol-dropdown-menu">
              <input
                type="text"
                value={symbolSearch}
                onChange={e => setSymbolSearch(e.target.value.toUpperCase())}
                onKeyDown={e => {
                  if (e.key === 'Enter' && symbolSearch.trim()) {
                    onSymbolChange?.(symbolSearch.trim())
                    setShowSymbolDropdown(false)
                  }
                }}
                placeholder="Search symbol..."
                autoFocus
              />
              {filteredSymbols.map(s => (
                <div
                  key={s}
                  className="symbol-dropdown-item"
                  onClick={() => { onSymbolChange?.(s); setShowSymbolDropdown(false) }}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              className={`btn-sm ${timeframe === tf ? 'btn-primary' : ''}`}
              onClick={() => onTimeframeChange?.(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
        <span className="spacer" />
        <div className="indicator-dropdown-wrapper">
          <button
            className="btn-sm"
            onClick={() => setShowIndDropdown(v => !v)}
          >
            Indicators{enabledIndicators.length > 0 ? ` (${enabledIndicators.length})` : ''} ▾
          </button>
          {showIndDropdown && (
            <div className="indicator-dropdown-menu">
              {INDICATOR_OPTIONS.map(ind => {
                const idx = enabledIndicators.indexOf(ind)
                const active = idx !== -1
                const c = active ? INDICATOR_COLORS[idx % INDICATOR_COLORS.length] : undefined
                return (
                  <div
                    key={ind}
                    className={`indicator-dropdown-item${active ? ' active' : ''}`}
                    onClick={() => { toggleIndicator(ind); setShowIndDropdown(false) }}
                  >
                    {active && <span className="indicator-color-dot" style={{ background: c }} />}
                    {ind.toUpperCase()}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div ref={containerRef} style={{ flex: 1, minHeight: 300, position: 'relative' }}>
        {loading && (
          <div className="flex items-center justify-center" style={{ position: 'absolute', inset: 0, background: 'var(--bg)', opacity: 0.8 }}>
            Loading...
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="flex items-center justify-center" style={{ position: 'absolute', inset: 0 }}>
            {error || `No data for ${symbol}`}
          </div>
        )}
      </div>
    </div>
  )
}
