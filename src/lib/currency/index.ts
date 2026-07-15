import * as frankfurter from './frankfurter'
import * as exchangerate from './exchangerate'

export async function convertCurrency(
  amount: number,
  from: string,
  to: string,
  fee: number = 0
): Promise<number> {
  if (from === to) return amount

  try {
    const result = await frankfurter.convert(amount, from, to)
    return applyFee(result, fee)
  } catch {
    try {
      const result = await exchangerate.convert(amount, from, to)
      return applyFee(result, fee)
    } catch {
      return amount
    }
  }
}

export async function getConversionRate(
  from: string,
  to: string
): Promise<number> {
  if (from === to) return 1
  try {
    const result = await frankfurter.convert(1, from, to)
    return result
  } catch {
    const result = await exchangerate.convert(1, from, to)
    return result
  }
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
