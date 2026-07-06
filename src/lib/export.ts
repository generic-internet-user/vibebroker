import type { Portfolio, Trade } from '../types'
import { savePortfolio } from '../db'

export function exportPortfolioJSON(portfolio: Portfolio): string {
  return JSON.stringify(portfolio, null, 2)
}

export function exportAllPortfolios(portfolios: Portfolio[]): string {
  const archive = {
    version: 1,
    exportedAt: new Date().toISOString(),
    portfolios,
  }
  return JSON.stringify(archive, null, 2)
}

export function importPortfolioJSON(json: string): Portfolio {
  const data = JSON.parse(json)
  if (data.version && data.portfolios) {
    return data.portfolios[0]
  }
  return data as Portfolio
}

export function importAllPortfolios(json: string): Portfolio[] {
  const data = JSON.parse(json)
  if (data.version && data.portfolios) {
    return data.portfolios
  }
  return [data as Portfolio]
}

export async function importAndSavePortfolios(json: string): Promise<number> {
  const portfolios = importAllPortfolios(json)
  for (const p of portfolios) {
    p.id = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    p.createdAt = Date.now()
    p.updatedAt = Date.now()
    await savePortfolio(p)
  }
  return portfolios.length
}

export function exportTradesCSV(trades: Trade[]): string {
  const header = 'Symbol,Action,Quantity,Price,Commission,Total,Date,Notes'
  const rows = trades.map((t) => {
    const date = new Date(t.timestamp).toISOString().split('T')[0]
    return `${t.symbol},${t.action},${t.quantity},${t.price.toFixed(2)},${t.commission.toFixed(2)},${t.totalValue.toFixed(2)},${date},${t.notes || ''}`
  })
  return [header, ...rows].join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string = 'application/json') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
