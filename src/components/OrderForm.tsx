import { useState } from 'react'
import type { OrderAction, OrderType, Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { createOrder, validateOrderRisk, submitOrder } from '../lib/trading'
import { getConversionRate } from '../lib/currency'
import { savePortfolio } from '../db'
import * as marketData from '../lib/market-data'
import { Modal } from './Modals'

interface Props {
  open: boolean
  onClose: () => void
  portfolio: Portfolio
  defaultAction?: OrderAction
}

export function OrderForm({ open, onClose, portfolio, defaultAction = 'buy' }: Props) {
  const { dispatch } = useApp()
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState<OrderAction>(defaultAction)
  const [type, setType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState('100')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [notes, setNotes] = useState('')
  const [stopLoss, setStopLoss] = useState(portfolio.settings.defaultStopLoss > 0 ? String(portfolio.settings.defaultStopLoss) : '')
  const [takeProfit, setTakeProfit] = useState(portfolio.settings.defaultTakeProfit > 0 ? String(portfolio.settings.defaultTakeProfit) : '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [previewQuote, setPreviewQuote] = useState<{ price: number; change: number } | null>(null)

  const fetchQuote = async (sym: string) => {
    if (!sym) return
    try {
      const quote = await marketData.getQuote(sym)
      setPreviewQuote({ price: quote.price, change: quote.changePercent })
      setPrice(quote.price.toFixed(2))
    } catch {
      setPreviewQuote(null)
    }
  }

  const handleSymbolBlur = () => {
    if (symbol) fetchQuote(symbol)
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)

    try {
      if (!symbol) {
        setError('Symbol is required')
        setSubmitting(false)
        return
      }

      const qty = parseInt(quantity, 10)
      if (isNaN(qty) || qty <= 0) {
        setError('Invalid quantity')
        setSubmitting(false)
        return
      }

      let orderPrice = 0
      if (type === 'limit' || type === 'stop_limit') {
        orderPrice = parseFloat(price)
        if (isNaN(orderPrice) || orderPrice <= 0) {
          setError('Invalid limit price')
          setSubmitting(false)
          return
        }
      }
      if (type === 'stop' || type === 'stop_limit') {
        const sp = parseFloat(stopPrice)
        if (isNaN(sp) || sp <= 0) {
          setError('Invalid stop price')
          setSubmitting(false)
          return
        }
      }

      let profile = null
      try {
        profile = await marketData.getProfile(symbol.toUpperCase())
      } catch {
        profile = null
      }
      const currency = profile?.currency || 'USD'

      let quote
      try {
        quote = await marketData.getQuote(symbol.toUpperCase())
      } catch {
        setError('Could not fetch current price for ' + symbol)
        setSubmitting(false)
        return
      }

      let rate = 1
      try {
        rate = await getConversionRate(currency, portfolio.baseCurrency)
      } catch {
        rate = 1
      }
      const orderCostBase = qty * quote.price * rate

      const order = createOrder({
        portfolioId: portfolio.id,
        symbol: symbol.toUpperCase(),
        type,
        action,
        quantity: qty,
        price: orderPrice,
        stopPrice: type === 'stop' || type === 'stop_limit' ? parseFloat(stopPrice) : undefined,
        limitPrice: type === 'limit' || type === 'stop_limit' ? parseFloat(price) : undefined,
        currency,
        notes,
        stopLoss: parseFloat(stopLoss) || undefined,
        takeProfit: parseFloat(takeProfit) || undefined,
      })

      const riskCheck = validateOrderRisk(order, portfolio, quote, portfolio.settings, {
        cashAvailable: portfolio.cashBalance,
        orderCostBase,
      })
      if (!riskCheck.valid) {
        setError(riskCheck.reason || 'Risk check failed')
        setSubmitting(false)
        return
      }

      const updatedPortfolio = await submitOrder({
        portfolio,
        order,
        quote,
        settings: portfolio.settings,
      })

      await savePortfolio(updatedPortfolio)
      dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updatedPortfolio })
      dispatch({ type: 'UPDATE_QUOTE', symbol: symbol.toUpperCase(), quote })

      onClose()
    } catch (err) {
      setError(String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`New Order — ${portfolio.name}`}
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Submitting...' : `Place ${action.replace('_', ' ')} Order`}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-2" style={{ color: 'var(--negative)' }}>{error}</div>
      )}

      <div className="form-row">
        <label>Symbol</label>
        <input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          onBlur={handleSymbolBlur}
          placeholder="e.g. AAPL"
          autoFocus
        />
        {previewQuote && (
          <span className={`mono text-sm ${previewQuote.change >= 0 ? 'text-positive' : 'text-negative'}`}>
            ${previewQuote.price.toFixed(2)}
          </span>
        )}
      </div>

      <div className="form-row">
        <label>Action</label>
        <select value={action} onChange={(e) => setAction(e.target.value as OrderAction)}>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
          <option value="short_sell">Short Sell</option>
          <option value="buy_to_cover">Buy to Cover</option>
        </select>
      </div>

      <div className="form-row">
        <label>Order Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as OrderType)}>
          <option value="market">Market</option>
          <option value="limit">Limit</option>
          <option value="stop">Stop</option>
          <option value="stop_limit">Stop-Limit</option>
        </select>
      </div>

      <div className="form-row">
        <label>Quantity</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} min="1" />
      </div>

      {(type === 'limit' || type === 'stop_limit') && (
        <div className="form-row">
          <label>Limit Price</label>
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} step="0.01" />
        </div>
      )}

      {(type === 'stop' || type === 'stop_limit') && (
        <div className="form-row">
          <label>Stop Price</label>
          <input type="number" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} step="0.01" />
        </div>
      )}

      <div className="form-row">
        <label>Stop Loss (%)</label>
        <input type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} step="0.1" placeholder={String(portfolio.settings.defaultStopLoss)} />
      </div>

      <div className="form-row">
        <label>Take Profit (%)</label>
        <input type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} step="0.1" placeholder={String(portfolio.settings.defaultTakeProfit)} />
      </div>

      <div className="form-row">
        <label>Notes</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
    </Modal>
  )
}
