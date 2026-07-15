import { useEffect, useState } from 'react'
import { getConversionRate } from './index'

export function useFxRates(baseCurrency: string, currencies: string[]): Record<string, number> {
  const [rates, setRates] = useState<Record<string, number>>({})
  const unique = Array.from(new Set(currencies)).sort().join(',')

  useEffect(() => {
    let active = true

    void (async () => {
      const result: Record<string, number> = {}
      for (const c of Array.from(new Set(currencies))) {
        if (c === baseCurrency) {
          result[c] = 1
          continue
        }
        try {
          result[c] = await getConversionRate(c, baseCurrency)
        } catch {
          result[c] = 1
        }
      }
      if (active) setRates(result)
    })()

    return () => {
      active = false
    }
  }, [baseCurrency, unique])

  return rates
}
