import { useEffect, useRef, useState } from 'react'
import { createChart, CandlestickSeries, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts'
import type { OHLCV, Timeframe } from '../types'
import { useApp } from '../store/AppContext'
import * as marketData from '../lib/market-data'
import { calculateIndicator } from '../lib/indicators'

interface Props {
  symbol: string
  portfolioId?: string
  timeframe: Timeframe
  onTimeframeChange?: (tf: Timeframe) => void
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y']
const RESOLUTION_MAP: Record<Timeframe, string> = {
  '1D': '5',
  '1W': '30',
  '1M': '60',
  '3M': 'D',
  '1Y': 'D',
}
const RANGE_MAP: Record<Timeframe, { from: number; to: number }> = {
  '1D': { from: 1, to: 0 },
  '1W': { from: 7, to: 0 },
  '1M': { from: 30, to: 0 },
  '3M': { from: 90, to: 0 },
  '1Y': { from: 365, to: 0 },
}

function resolveCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888888'
}

export function Chart({ symbol, timeframe, onTimeframeChange }: Props) {
  const { state } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const indicatorSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const [data, setData] = useState<OHLCV[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enabledIndicators, setEnabledIndicators] = useState<string[]>([])
  const [indicatorParams, setIndicatorParams] = useState<Record<string, Record<string, number>>>({})

  useEffect(() => {
    if (!symbol || !containerRef.current) return

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 400,
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
      handleScroll: false,
      handleScale: false,
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

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
      candleSeriesRef.current = null
      indicatorSeriesRef.current = null
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
    if (indicatorSeriesRef.current) {
      indicatorSeriesRef.current.applyOptions({
        color: '#4488ff',
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
        const range = RANGE_MAP[timeframe]
        const from = now - range.from * 86400
        const to = now - range.to * 86400
        const resolution = RESOLUTION_MAP[timeframe]

        const candles = await marketData.getCandles(symbol, resolution, from, to)
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

    if (indicatorSeriesRef.current) {
      chartRef.current?.removeSeries(indicatorSeriesRef.current)
      indicatorSeriesRef.current = null
    }

    if (enabledIndicators.length > 0) {
      const indicator = enabledIndicators[0]
      const params = indicatorParams[indicator] || {}
      const results = calculateIndicator(indicator as any, data, params)

      if (results.length > 0) {
        const lineSeries = chartRef.current!.addSeries(LineSeries, {
          color: '#4488ff',
          lineWidth: 1,
          lastValueVisible: false,
          priceLineVisible: false,
        })
        indicatorSeriesRef.current = lineSeries

        lineSeries.setData(
          results.map(r => ({
            time: (r.timestamp / 1000) as any,
            value: typeof r.value === 'number' ? r.value : (r.value as [number, number])[0],
          }))
        )
      }
    }
  }, [enabledIndicators, indicatorParams, data])

  const toggleIndicator = (type: string) => {
    setEnabledIndicators(prev =>
      prev.includes(type) ? [] : [type]
    )
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center gap-2 mb-1" style={{ minHeight: 28 }}>
        <span className="font-bold">{symbol}</span>
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
        <div className="flex gap-1">
          {['sma', 'ema', 'vwap', 'rsi', 'macd', 'bollinger', 'atr', 'stochastic'].map(ind => (
            <button
              key={ind}
              className={`btn-sm ${enabledIndicators.includes(ind) ? 'btn-primary' : ''}`}
              onClick={() => toggleIndicator(ind)}
              title={ind.toUpperCase()}
            >
              {ind.toUpperCase()}
            </button>
          ))}
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
