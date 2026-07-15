import * as frankfurter from './frankfurter'
import * as exchangerate from './exchangerate'

const rateCache = new Map<string, { rate: number; expires: number }>()
const RATE_TTL_MS = 5 * 60 * 1000

function cacheKey(from: string, to: string): string {
  return `${from}->${to}`
}

async function fetchRate(from: string, to: string): Promise<number> {
  try {
    return await frankfurter.convert(1, from, to)
  } catch {
    return exchangerate.convert(1, from, to)
  }
}

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  fee: number = 0
): Promise<number> {
  if (from === to) return amount

  const rate = await getConversionRate(from, to)
  return applyFee(amount * rate, fee)
}

export async function getConversionRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1

  const key = cacheKey(from, to)
  const cached = rateCache.get(key)
  if (cached && cached.expires > Date.now()) return cached.rate

  const rate = await fetchRate(from, to)
  rateCache.set(key, { rate, expires: Date.now() + RATE_TTL_MS })
  return rate
}

function applyFee(amount: number, feePercentage: number): number {
  if (feePercentage <= 0) return amount
  return amount * (1 - feePercentage / 100)
}

export async function getSupportedCurrencies(): Promise<string[]> {
  try {
    const rates = await frankfurter.getRates('USD')
    return [rates.base, ...Object.keys(rates.rates)].sort()
  } catch {
    return exchangerate.getSupportedCurrencies().catch(() =>
      ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'CNY', 'INR', 'BRL', 'MXN', 'SGD', 'HKD', 'KRW', 'ZAR', 'TRY']
    )
  }
}
