import React from 'react'
import type { Portfolio } from '../types'
import { useApp } from '../store/AppContext'

interface Props {
  portfolio: Portfolio
  onBuy: () => void
  onSell: () => void
}

export function PortfolioView({ portfolio, onBuy, onSell }: Props) {
  const { state } = useApp()
  const totalValue = portfolio.cashBalance + portfolio.positions.reduce((s, p) => s + p.marketValue, 0)
  const totalPnL = portfolio.tradeHistory.reduce((s, t) => {
    return t.action === 'sell' || t.action === 'short_sell' ? s + t.totalValue : s - t.totalValue
  }, 0)

  const tab = 'positions' // simplified - just show positions

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
          <div className="label">Positions</div>
          <div className="value">{portfolio.positions.length}</div>
        </div>
      </div>

      <div className="flex gap-2 mb-2">
        <button className="btn-positive" onClick={onBuy}>Buy <span className="key-hint">B</span></button>
        <button className="btn-negative" onClick={onSell}>Sell <span className="key-hint">S</span></button>
      </div>

      <div className="tab-bar">
        <button className="tab active">Positions</button>
        <button className="tab">Orders</button>
        <button className="tab">History</button>
        <button className="tab">Performance</button>
        <button className="tab">Notes</button>
      </div>

      {portfolio.positions.length === 0 ? (
        <div className="empty-state flex-1">No positions. Start trading!</div>
      ) : (
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
              const unrealizedPnL = marketValue - (pos.averageCost * pos.quantity)
              const unrealizedPnLPercent = (unrealizedPnL / (pos.averageCost * pos.quantity)) * 100

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
      )}

      {portfolio.notes && (
        <div className="panel mt-2">
          <div className="panel-header">Notes</div>
          <div className="panel-body">
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)' }}>{portfolio.notes}</pre>
          </div>
        </div>
      )}
    </div>
  )
}
