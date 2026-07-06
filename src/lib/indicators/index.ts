import type { OHLCV, IndicatorResult, IndicatorType } from '../../types'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function sma(data: number[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = []
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) sum += data[i - j]
    result.push({ timestamp: Date.now(), value: sum / period })
  }
  return result
}

export function smaFromOHLC(data: OHLCV[], period: number): IndicatorResult[] {
  const closes = data.map((d) => d.close)
  const result: IndicatorResult[] = []
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) sum += closes[i - j]
    result.push({ timestamp: data[i].timestamp, value: sum / period })
  }
  return result
}

export function ema(data: number[], period: number): IndicatorResult[] {
  const result: IndicatorResult[] = []
  const k = 2 / (period + 1)
  let emaValue = data[0]
  result.push({ timestamp: Date.now(), value: emaValue })

  for (let i = 1; i < data.length; i++) {
    emaValue = data[i] * k + emaValue * (1 - k)
    result.push({ timestamp: Date.now(), value: emaValue })
  }
  return result
}

export function emaFromOHLC(data: OHLCV[], period: number): IndicatorResult[] {
  const closes = data.map((d) => d.close)
  const result: IndicatorResult[] = []
  const k = 2 / (period + 1)
  let emaValue = closes[0]
  result.push({ timestamp: data[0].timestamp, value: emaValue })

  for (let i = 1; i < closes.length; i++) {
    emaValue = closes[i] * k + emaValue * (1 - k)
    result.push({ timestamp: data[i].timestamp, value: emaValue })
  }
  return result
}

export function rsi(data: OHLCV[], period: number = 14): IndicatorResult[] {
  const closes = data.map((d) => d.close)
  const result: IndicatorResult[] = []
  const changes: number[] = []

  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1])
  }

  for (let i = period; i < changes.length; i++) {
    let gains = 0, losses = 0
    for (let j = i - period; j < i; j++) {
      if (changes[j] > 0) gains += changes[j]
      else losses += Math.abs(changes[j])
    }
    const avgGain = gains / period
    const avgLoss = losses / period
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
    const rsiValue = 100 - 100 / (1 + rs)
    result.push({ timestamp: data[i].timestamp, value: clamp(rsiValue, 0, 100) })
  }
  return result
}

export function macd(
  data: OHLCV[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): IndicatorResult[] {
  const closes = data.map((d) => d.close)
  const fastEMA = ema(closes, fastPeriod)
  const slowEMA = ema(closes, slowPeriod)
  const macdLine: number[] = []

  const offset = fastEMA.length - slowEMA.length
  for (let i = 0; i < slowEMA.length; i++) {
    macdLine.push(fastEMA[i + offset].value - slowEMA[i].value)
  }

  const signal = ema(macdLine, signalPeriod)
  const signalOffset = macdLine.length - signal.length

  return signal.map((s, i) => ({
    timestamp: data[i + slowPeriod - 1 + signalOffset + offset]?.timestamp || Date.now(),
    value: [macdLine[i + signalOffset], s.value, macdLine[i + signalOffset] - s.value] as [number, number, number],
  }))
}

export function bollinger(
  data: OHLCV[],
  period: number = 20,
  stdDev: number = 2
): IndicatorResult[] {
  const closes = data.map((d) => d.close)
  const result: IndicatorResult[] = []

  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) sum += closes[i - j]
    const mean = sum / period

    let sqSum = 0
    for (let j = 0; j < period; j++) sqSum += (closes[i - j] - mean) ** 2
    const std = Math.sqrt(sqSum / period)

    result.push({
      timestamp: data[i].timestamp,
      value: [mean - stdDev * std, mean, mean + stdDev * std] as [number, number, number],
    })
  }
  return result
}

export function atr(data: OHLCV[], period: number = 14): IndicatorResult[] {
  const result: IndicatorResult[] = []
  const trValues: number[] = []

  for (let i = 1; i < data.length; i++) {
    const high = data[i].high
    const low = data[i].low
    const prevClose = data[i - 1].close
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )
    trValues.push(tr)
  }

  for (let i = period - 1; i < trValues.length; i++) {
    let sum = 0
    for (let j = 0; j < period; j++) sum += trValues[i - j]
    result.push({
      timestamp: data[i + 1].timestamp,
      value: sum / period,
    })
  }
  return result
}

export function stochastic(
  data: OHLCV[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): IndicatorResult[] {
  const result: IndicatorResult[] = []
  const kValues: number[] = []

  for (let i = period - 1; i < data.length; i++) {
    let highestHigh = -Infinity
    let lowestLow = Infinity
    for (let j = 0; j < period; j++) {
      highestHigh = Math.max(highestHigh, data[i - j].high)
      lowestLow = Math.min(lowestLow, data[i - j].low)
    }
    const k = ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100
    kValues.push(clamp(k, 0, 100))
  }

  for (let i = smoothK - 1; i < kValues.length; i++) {
    let sum = 0
    for (let j = 0; j < smoothK; j++) sum += kValues[i - j]
    const kSmooth = sum / smoothK

    if (i >= smoothK + smoothD - 2) {
      let dSum = 0
      for (let j = 0; j < smoothD; j++) dSum += kValues[i - j]
      const d = dSum / smoothD
      result.push({
        timestamp: data[i + period - 1].timestamp,
        value: [kSmooth, d] as [number, number],
      })
    }
  }
  return result
}

export function vwap(data: OHLCV[]): IndicatorResult[] {
  const result: IndicatorResult[] = []
  let cumPV = 0
  let cumVol = 0

  for (const d of data) {
    const typicalPrice = (d.high + d.low + d.close) / 3
    cumPV += typicalPrice * d.volume
    cumVol += d.volume
    result.push({
      timestamp: d.timestamp,
      value: cumPV / cumVol,
    })
  }
  return result
}

export function calculateIndicator(
  type: IndicatorType,
  data: OHLCV[],
  parameters: Record<string, number>
): IndicatorResult[] {
  switch (type) {
    case 'sma':
      return smaFromOHLC(data, parameters.period || 20)
    case 'ema':
      return emaFromOHLC(data, parameters.period || 20)
    case 'vwap':
      return vwap(data)
    case 'rsi':
      return rsi(data, parameters.period || 14)
    case 'macd':
      return macd(data, parameters.fastPeriod || 12, parameters.slowPeriod || 26, parameters.signalPeriod || 9)
    case 'bollinger':
      return bollinger(data, parameters.period || 20, parameters.stdDev || 2)
    case 'atr':
      return atr(data, parameters.period || 14)
    case 'stochastic':
      return stochastic(data, parameters.period || 14, parameters.smoothK || 3, parameters.smoothD || 3)
    default:
      return []
  }
}
