import Dexie, { type Table } from 'dexie'
import type { Portfolio, Watchlist, Snapshot, Order, Trade } from '../types'

export class PaperTradingDB extends Dexie {
  portfolios!: Table<Portfolio, string>
  watchlists!: Table<Watchlist, string>
  snapshots!: Table<Snapshot, string>
  orders!: Table<Order, string>
  trades!: Table<Trade, string>

  constructor() {
    super('PaperTradingDB')

    this.version(1).stores({
      portfolios: 'id, name, baseCurrency, archived, createdAt',
      watchlists: 'id, name, createdAt',
      snapshots: 'id, portfolioId, createdAt',
      orders: 'id, portfolioId, symbol, status, createdAt',
      trades: 'id, portfolioId, symbol, timestamp',
    })
  }
}

export const db = new PaperTradingDB()

export async function getAllPortfolios(): Promise<Portfolio[]> {
  return db.portfolios.toArray()
}

export async function getActivePortfolios(): Promise<Portfolio[]> {
  return db.portfolios.where('archived').equals(0).toArray()
}

export async function getPortfolio(id: string): Promise<Portfolio | undefined> {
  return db.portfolios.get(id)
}

export async function savePortfolio(portfolio: Portfolio): Promise<void> {
  await db.portfolios.put(portfolio)
}

export async function deletePortfolio(id: string): Promise<void> {
  await db.portfolios.delete(id)
}

export async function getAllWatchlists(): Promise<Watchlist[]> {
  return db.watchlists.toArray()
}

export async function saveWatchlist(watchlist: Watchlist): Promise<void> {
  await db.watchlists.put(watchlist)
}

export async function deleteWatchlist(id: string): Promise<void> {
  await db.watchlists.delete(id)
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  await db.snapshots.put(snapshot)
}

export async function getSnapshots(portfolioId: string): Promise<Snapshot[]> {
  return db.snapshots.where('portfolioId').equals(portfolioId).toArray()
}
