import type { Portfolio } from '../types'
import { useApp } from '../store/AppContext'

interface Props {
  portfolio: Portfolio
}

export function BalancePanel({ portfolio }: Props) {
  const { state } = useApp()

  const totalValue = portfolio.cashBalance + portfolio.positions.reduce((s, p) => {
    const quote = state.quotes[p.symbol]
    return s + (quote?.price || p.currentPrice) * p.quantity
  }, 0)

  const totalInvested = portfolio.positions.reduce((s, p) => s + p.averageCost * p.quantity, 0)
  const totalPnL = totalValue - portfolio.cashBalance - totalInvested
  const totalReturn = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0

  return (
    <div className="balance-panel">
      <div className="balance-stat">
        <div className="balance-label">Total Value</div>
        <div className="balance-value">${totalValue.toFixed(2)}</div>
      </div>
      <div className="balance-stat">
        <div className="balance-label">Cash</div>
        <div className="balance-value" style={{ color: portfolio.cashBalance >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          ${portfolio.cashBalance.toFixed(2)}
        </div>
      </div>
      <div className="balance-stat">
        <div className="balance-label">P&L</div>
        <div className="balance-value" style={{ color: totalPnL >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          ${totalPnL.toFixed(2)}
        </div>
        <div className="balance-change">{totalReturn.toFixed(2)}%</div>
      </div>
    </div>
  )
}
