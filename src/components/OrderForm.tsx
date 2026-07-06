import React, { useState } from 'react'
import type { OrderAction, OrderType, Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { createOrder, validateOrderRisk, executeOrder, applyTradeToPortfolio } from '../lib/trading'
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
  const { dispatch, state } = useApp()
  const [symbol, setSymbol] = useState('')
  const [action, setAction] = useState<OrderAction>(defaultAction)
  const [type, setType] = useState<OrderType>('market')
  const [quantity, setQuantity] = useState('100')
  const [price, setPrice] = useState('')
  const [stopPrice, setStopPrice] = useState('')
  const [limitPrice, setLimitPrice] = useState('')
  const [notes, setNotes] = useState('')
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
      if (type === 'limit') {
        orderPrice = parseFloat(price)
        if (isNaN(orderPrice) || orderPrice <= 0) {
          setError('Invalid limit price')
          setSubmitting(false)
          return
        }
      }

      let order = createOrder({
        portfolioId: portfolio.id,
        symbol: symbol.toUpperCase(),
        type,
        action,
        quantity: qty,
        price: orderPrice,
        stopPrice: type === 'stop' || type === 'stop_limit' ? parseFloat(stopPrice) : undefined,
        limitPrice: type === 'stop_limit' ? parseFloat(limitPrice) : undefined,
        notes,
      })

      let quote
      try {
        quote = await marketData.getQuote(symbol.toUpperCase())
      } catch {
        setError('Could not fetch current price for ' + symbol)
        setSubmitting(false)
        return
      }

      const riskCheck = validateOrderRisk(order, portfolio, quote, portfolio.settings)
      if (!riskCheck.valid) {
        setError(riskCheck.reason || 'Risk check failed')
        setSubmitting(false)
        return
      }

      const { filledOrder, trade } = executeOrder(order, portfolio, quote, portfolio.settings)
      const updatedPortfolio = applyTradeToPortfolio(portfolio, trade, filledOrder)

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
        <label>Notes</label>
        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
      </div>
    </Modal>
  )
}
