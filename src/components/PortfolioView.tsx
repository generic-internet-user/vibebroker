import { useState, useEffect } from 'react'
import type { Portfolio, Order, Trade } from '../types'
import { useApp } from '../store/AppContext'
import { savePortfolio } from '../db'
import * as marketData from '../lib/market-data'

interface Props {
  portfolio: Portfolio
  onBuy: () => void
  onSell: () => void
}

export function PortfolioView({ portfolio, onBuy, onSell }: Props) {
  const { state, dispatch } = useApp()
  const [activeTab, setActiveTab] = useState('positions')
  const [notesText, setNotesText] = useState(portfolio.notes)

  useEffect(() => {
    setNotesText(portfolio.notes)
  }, [portfolio.id, portfolio.notes])

  const handleSaveNotes = async () => {
    const updated = { ...portfolio, notes: notesText, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
  }

  const totalValue = portfolio.cashBalance + portfolio.positions.reduce((s, p) => {
    const quote = state.quotes[p.symbol]
    return s + (quote?.price || p.currentPrice) * p.quantity
  }, 0)

  const totalInvested = portfolio.positions.reduce((s, p) => s + p.averageCost * p.quantity, 0)
  const totalPnL = totalValue - portfolio.cashBalance - totalInvested
  const totalReturn = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="grid-3 mb-2">
        <div className="stat">
          <div className="label">Total Value</div>
          <div className="value">${totalValue.toFixed(2)}</div>
        </div>
        <div className="stat">
          <div className="label">Cash</div>
          <div className="value" style={{ color: portfolio.cashBalance >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
            ${portfolio.cashBalance.toFixed(2)}
          </div>
        </div>
        <div className="stat">
          <div className="label">P&L</div>
          <div className={`value ${totalPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
            ${totalPnL.toFixed(2)}
          </div>
          <div className={`change ${totalReturn >= 0 ? 'text-positive' : 'text-negative'}`}>
            {totalReturn.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <button className="btn-positive" onClick={onBuy}>Buy <span className="key-hint">B</span></button>
        <button className="btn-negative" onClick={onSell}>Sell <span className="key-hint">S</span></button>
      </div>

      <div className="tab-bar">
        {['positions', 'orders', 'history', 'performance', 'notes'].map(t => (
          <button
            key={t}
            className={`tab ${activeTab === t ? 'active' : ''}`}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'positions' && <PositionsTab portfolio={portfolio} />}
      {activeTab === 'orders' && <OrdersTab portfolio={portfolio} />}
      {activeTab === 'history' && <HistoryTab portfolio={portfolio} />}
      {activeTab === 'performance' && <PerformanceTab portfolio={portfolio} />}
      {activeTab === 'notes' && <NotesTab portfolio={portfolio} notesText={notesText} setNotesText={setNotesText} onSave={handleSaveNotes} />}
    </div>
  )
}

function PositionsTab({ portfolio }: { portfolio: Portfolio }) {
  const { state } = useApp()

  if (portfolio.positions.length === 0) {
    return <div className="empty-state flex-1">No positions. Start trading!</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Quantity</th>
          <th className="text-right">Avg Cost</th>
          <th className="text-right">Price</th>
          <th className="text-right">Market Value</th>
          <th className="text-right">Unrealized P&L</th>
          <th className="text-right">Day Change</th>
        </tr>
      </thead>
      <tbody>
        {portfolio.positions.map((pos) => {
          const quote = state.quotes[pos.symbol]
          const currentPrice = quote?.price || pos.currentPrice
          const marketValue = pos.quantity * currentPrice
          const cost = pos.averageCost * pos.quantity
          const unrealizedPnL = marketValue - cost
          const unrealizedPnLPercent = cost > 0 ? (unrealizedPnL / cost) * 100 : 0

          return (
            <tr key={pos.symbol}>
              <td className="font-bold">{pos.symbol}</td>
              <td>{pos.quantity}</td>
              <td className="text-right mono">${pos.averageCost.toFixed(2)}</td>
              <td className="text-right mono">${currentPrice.toFixed(2)}</td>
              <td className="text-right mono">${marketValue.toFixed(2)}</td>
              <td className={`text-right mono ${unrealizedPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
                ${unrealizedPnL.toFixed(2)} ({unrealizedPnLPercent.toFixed(2)}%)
              </td>
              <td className={`text-right mono ${(quote?.change || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                ${(quote?.change || 0).toFixed(2)} ({(quote?.changePercent || 0).toFixed(2)}%)
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function OrdersTab({ portfolio }: { portfolio: Portfolio }) {
  const sorted = [...portfolio.orders].sort((a, b) => b.createdAt - a.createdAt)

  if (sorted.length === 0) {
    return <div className="empty-state flex-1">No orders yet.</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbol</th>
          <th>Action</th>
          <th>Type</th>
          <th className="text-right">Qty</th>
          <th className="text-right">Price</th>
          <th className="text-right">Filled</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((o) => (
          <tr key={o.id}>
            <td className="text-sm">{new Date(o.createdAt).toLocaleDateString()}</td>
            <td className="font-bold">{o.symbol}</td>
            <td><span className={`badge ${o.action === 'buy' || o.action === 'buy_to_cover' ? 'badge-buy' : 'badge-sell'}`}>{o.action.replace('_', ' ')}</span></td>
            <td>{o.type}</td>
            <td className="text-right mono">{o.quantity}</td>
            <td className="text-right mono">${(o.averageFillPrice || o.price).toFixed(2)}</td>
            <td className="text-right mono">{o.filledQuantity}/{o.quantity}</td>
            <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function HistoryTab({ portfolio }: { portfolio: Portfolio }) {
  const sorted = [...portfolio.tradeHistory].sort((a, b) => b.timestamp - a.timestamp)

  if (sorted.length === 0) {
    return <div className="empty-state flex-1">No trades yet.</div>
  }

  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbol</th>
          <th>Action</th>
          <th className="text-right">Qty</th>
          <th className="text-right">Price</th>
          <th className="text-right">Commission</th>
          <th className="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((t) => (
          <tr key={t.id}>
            <td className="text-sm">{new Date(t.timestamp).toLocaleDateString()}</td>
            <td className="font-bold">{t.symbol}</td>
            <td><span className={`badge ${t.action === 'buy' || t.action === 'buy_to_cover' ? 'badge-buy' : 'badge-sell'}`}>{t.action.replace('_', ' ')}</span></td>
            <td className="text-right mono">{t.quantity}</td>
            <td className="text-right mono">${t.price.toFixed(2)}</td>
            <td className="text-right mono">${t.commission.toFixed(2)}</td>
            <td className={`text-right mono ${t.totalValue >= 0 ? '' : 'text-negative'}`}>
              ${Math.abs(t.totalValue).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PerformanceTab({ portfolio }: { portfolio: Portfolio }) {
  const { state } = useApp()

  const positionsValue = portfolio.positions.reduce((s, p) => {
    const quote = state.quotes[p.symbol]
    return s + (quote?.price || p.currentPrice) * p.quantity
  }, 0)

  const totalValue = portfolio.cashBalance + positionsValue
  const totalInvested = portfolio.positions.reduce((s, p) => s + p.averageCost * p.quantity, 0)
  const totalPnL = totalValue - portfolio.cashBalance - totalInvested
  const totalReturn = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0
  const totalCommission = portfolio.tradeHistory.reduce((s, t) => s + t.commission, 0)
  const tradeCount = portfolio.tradeHistory.length
  const cashPct = totalValue > 0 ? (portfolio.cashBalance / totalValue) * 100 : 0
  const positionsPct = totalValue > 0 ? (positionsValue / totalValue) * 100 : 0

  return (
    <div className="grid-2 mt-2">
      <div className="stat">
        <div className="label">Total Return</div>
        <div className={`value ${totalReturn >= 0 ? 'text-positive' : 'text-negative'}`}>
          {totalReturn.toFixed(2)}%
        </div>
      </div>
      <div className="stat">
        <div className="label">Total P&L</div>
        <div className={`value ${totalPnL >= 0 ? 'text-positive' : 'text-negative'}`}>
          ${totalPnL.toFixed(2)}
        </div>
      </div>
      <div className="stat">
        <div className="label">Total Commission</div>
        <div className="value">${totalCommission.toFixed(2)}</div>
      </div>
      <div className="stat">
        <div className="label">Trade Count</div>
        <div className="value">{tradeCount}</div>
      </div>
      <div className="stat">
        <div className="label">Cash Allocation</div>
        <div className="value">{cashPct.toFixed(1)}%</div>
      </div>
      <div className="stat">
        <div className="label">Position Allocation</div>
        <div className="value">{positionsPct.toFixed(1)}%</div>
      </div>
    </div>
  )
}

function NotesTab({ portfolio, notesText, setNotesText, onSave }: {
  portfolio: Portfolio
  notesText: string
  setNotesText: (v: string) => void
  onSave: () => void
}) {
  return (
    <div className="flex flex-col gap-2 mt-2" style={{ height: '100%' }}>
      <textarea
        value={notesText}
        onChange={(e) => setNotesText(e.target.value)}
        style={{ width: '100%', minHeight: 200, flex: 1 }}
        placeholder="Write your notes about this portfolio..."
      />
      <div className="flex gap-1">
        <button className="btn-primary" onClick={onSave}>Save Notes</button>
      </div>
    </div>
  )
}
