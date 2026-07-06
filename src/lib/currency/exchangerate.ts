const BASE_URL = 'https://v6.exchangerate-api.com/v6'

function getKey(): string {
  return localStorage.getItem('exchangerate_api_key') || ''
}

export async function convert(
  amount: number,
  from: string,
  to: string
): Promise<number> {
  if (from === to) return amount
  const key = getKey()
  if (!key) throw new Error('ExchangeRate-API key not configured')

  const res = await fetch(`${BASE_URL}/${key}/pair/${from}/${to}`)
  if (!res.ok) throw new Error(`ExchangeRate-API error: ${res.status}`)

  const data = await res.json()
  if (data.result !== 'success') throw new Error(data['error-type'] || 'ExchangeRate-API error')

  return amount * data.conversion_rate
}

export async function getSupportedCurrencies(): Promise<string[]> {
  const key = getKey()
  if (!key) throw new Error('ExchangeRate-API key not configured')

  const res = await fetch(`${BASE_URL}/${key}/codes`)
  if (!res.ok) throw new Error(`ExchangeRate-API error: ${res.status}`)

  const data = await res.json()
  return (data.supported_codes || []).map((c: [string, string]) => c[0])
}
