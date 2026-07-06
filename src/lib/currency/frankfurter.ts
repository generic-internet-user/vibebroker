const BASE_URL = 'https://api.frankfurter.app'

export interface FrankfurterRate {
  amount: number
  base: string
  date: string
  rates: Record<string, number>
}

export async function getRates(base: string = 'USD'): Promise<FrankfurterRate> {
  const res = await fetch(`${BASE_URL}/latest?from=${base}`)
  if (!res.ok) throw new Error(`Frankfurter rate error: ${res.status}`)
  return res.json()
}

export async function convert(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return amount
  const res = await fetch(`${BASE_URL}/latest?from=${from}&to=${to}`)
  if (!res.ok) throw new Error(`Frankfurter convert error: ${res.status}`)
  const data = await res.json()
  return amount * data.rates[to]
}
