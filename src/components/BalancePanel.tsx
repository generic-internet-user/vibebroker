import type { Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { useFxRates } from '../lib/currency/useFxRates'

interface Props {
  portfolio: Portfolio
}

export function BalancePanel({ portfolio }: Props) {
  const { state } = useApp()
  const rates = useFxRates(portfolio.baseCurrency, portfolio.positions.map(p => p.currency || 'USD'))
  const rate = (c: string) => rates[c] || 1
  const currencyOf = (p: typeof portfolio.positions[number]) => state.quotes[p.symbol]?.currency || p.currency || 'USD'

  const totalValue = portfolio.cashBalance + portfolio.positions.reduce((s, p) => {
    const quote = state.quotes[p.symbol]
    return s + (quote?.price || p.currentPrice) * p.quantity * rate(currencyOf(p))
  }, 0)

  const totalInvested = portfolio.positions.reduce((s, p) => s + p.averageCost * p.quantity * rate(currencyOf(p)), 0)
  const totalPnL = totalValue - portfolio.cashBalance - totalInvested
  const realizedPnL = portfolio.realizedPnL ?? 0
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
        <div className="balance-label">Unrealized P&L</div>
        <div className="balance-value" style={{ color: totalPnL >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          ${totalPnL.toFixed(2)}
        </div>
        <div className="balance-change">{totalReturn.toFixed(2)}%</div>
      </div>
      <div className="balance-stat">
        <div className="balance-label">Realized P&L</div>
        <div className="balance-value" style={{ color: realizedPnL >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
          ${realizedPnL.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
