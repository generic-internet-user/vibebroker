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
    <div className="grid-3">
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
  )
}
