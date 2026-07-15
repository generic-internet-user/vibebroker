import type { Order, OrderAction, OrderType, Portfolio, Trade, Quote, PortfolioSettings, AssetType } from '../../types'
import { calculateCommission } from './commissions'
import { simulateSlippage } from './slippage'
import { getConversionRate } from '../currency'

let orderCounter = 0

export function createOrder(params: {
  portfolioId: string
  symbol: string
  type: OrderType
  action: OrderAction
  quantity: number
  price?: number
  stopPrice?: number
  limitPrice?: number
  currency?: string
  notes?: string
  stopLoss?: number
  takeProfit?: number
}): Order {
  orderCounter++
  const now = Date.now()
  const isLimit = params.type === 'limit' || params.type === 'stop_limit'
  const isStop = params.type === 'stop' || params.type === 'stop_limit'

  return {
    id: `ord_${now}_${orderCounter}`,
    portfolioId: params.portfolioId,
    symbol: params.symbol,
    type: params.type,
    action: params.action,
    quantity: params.quantity,
    price: isLimit ? (params.limitPrice || 0) : (params.price || 0),
    stopPrice: isStop ? params.stopPrice : undefined,
    limitPrice: isLimit ? params.limitPrice : undefined,
    currency: params.currency,
    status: 'pending',
    filledQuantity: 0,
    averageFillPrice: 0,
    commission: 0,
    slippage: 0,
    createdAt: now,
    updatedAt: now,
    notes: params.notes,
    stopLoss: params.stopLoss,
    takeProfit: params.takeProfit,
  }
}

export interface FillEvaluation {
  triggered: boolean
  fillPrice: number
  isBuy: boolean
}

export function evaluateFill(
  order: Order,
  quote: Quote
): FillEvaluation | null {
  const px = quote.price
  const isBuy = order.action === 'buy' || order.action === 'buy_to_cover'
  const type = order.type

  if (type === 'market') {
    return { triggered: true, fillPrice: px, isBuy }
  }

  if (type === 'limit') {
    const lim = order.limitPrice ?? order.price
    if (isBuy) {
      if (px <= lim) return { triggered: true, fillPrice: Math.min(px, lim), isBuy }
    } else {
      if (px >= lim) return { triggered: true, fillPrice: Math.max(px, lim), isBuy }
    }
    return null
  }

  if (type === 'stop') {
    const stop = order.stopPrice ?? 0
    if (isBuy) {
      if (px >= stop) return { triggered: true, fillPrice: px, isBuy }
    } else {
      if (px <= stop) return { triggered: true, fillPrice: px, isBuy }
    }
    return null
  }

  if (type === 'stop_limit') {
    const stop = order.stopPrice ?? 0
    const lim = order.limitPrice ?? order.price
    const triggered = isBuy ? px >= stop : px <= stop
    if (!triggered) return null
    if (isBuy) {
      if (px <= lim) return { triggered: true, fillPrice: Math.min(px, lim), isBuy }
    } else {
      if (px >= lim) return { triggered: true, fillPrice: Math.max(px, lim), isBuy }
    }
    return null
  }

  return null
}

interface FillResult {
  filledOrder: Order
  trade: Trade
  rate: number
}

async function buildFill(
  order: Order,
  quote: Quote,
  settings: PortfolioSettings,
  fillQty: number,
  portfolio: Portfolio
): Promise<FillResult> {
  const evaluation = evaluateFill(order, quote)
  if (!evaluation) throw new Error('Order is not fillable at current price')
  const { fillPrice, isBuy } = evaluation

  const slippageApplies = order.type === 'market' || order.type === 'stop'
  const slipMag = slippageApplies ? Math.abs(simulateSlippage(fillPrice, settings.slippageModel)) : 0
  const adjPrice = isBuy ? fillPrice + slipMag : fillPrice - slipMag

  const commission = calculateCommission(fillQty, adjPrice, settings.commissionModel)
  const grossAsset = isBuy ? adjPrice * fillQty + commission : adjPrice * fillQty - commission

  const assetCurrency = order.currency || 'USD'
  const baseCurrency = portfolio.baseCurrency
  const rate = await getConversionRate(assetCurrency, baseCurrency)
  const fee = settings.currencyConversionFee / 100
  const feeFactor = isBuy ? 1 + fee : 1 - fee
  const baseCash = grossAsset * rate * feeFactor

  const previousFilled = order.filledQuantity
  const previousAvg = order.averageFillPrice
  const newFilled = previousFilled + fillQty
  const averageFillPrice = previousFilled === 0
    ? adjPrice
    : (previousAvg * previousFilled + adjPrice * fillQty) / newFilled
  const completed = newFilled >= order.quantity

  const filledOrder: Order = {
    ...order,
    status: completed ? 'filled' : 'partially_filled',
    filledQuantity: newFilled,
    averageFillPrice,
    commission: order.commission + commission,
    slippage: slipMag,
    price: adjPrice,
    updatedAt: Date.now(),
  }

  const trade: Trade = {
    id: `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    portfolioId: portfolio.id,
    orderId: order.id,
    symbol: order.symbol,
    action: order.action,
    quantity: fillQty,
    price: adjPrice,
    commission,
    totalValue: Math.abs(baseCash),
    currency: assetCurrency,
    realizedPnL: 0,
    timestamp: Date.now(),
  }

  return { filledOrder, trade, rate }
}

export function applyTradeToPortfolio(
  portfolio: Portfolio,
  trade: Trade,
  order: Order,
  rate: number
): Portfolio {
  const positions = portfolio.positions.map(p => ({ ...p, asset: { ...p.asset } }))
  const idx = positions.findIndex(p => p.symbol === trade.symbol)
  const isBuy = order.action === 'buy' || order.action === 'buy_to_cover'
  const delta = isBuy ? trade.quantity : -trade.quantity
  const absDelta = Math.abs(delta)
  const price = trade.price
  const commission = trade.commission
  const effPrice = price + (isBuy ? commission / absDelta : -commission / absDelta)

  const pos = idx >= 0 ? positions[idx] : null
  const curQty = pos ? pos.quantity : 0
  const curAvg = pos ? pos.averageCost : 0
  const curRealized = pos ? pos.realizedPnL : 0

  let newQty = curQty + delta
  let newAvg = curAvg
  let realizedAsset = 0

  if (curQty === 0) {
    newAvg = effPrice
  } else if (Math.sign(curQty) === Math.sign(delta)) {
    newQty = curQty + delta
    newAvg = (Math.abs(curQty) * curAvg + absDelta * effPrice) / Math.abs(newQty)
  } else {
    const closeQty = Math.min(absDelta, Math.abs(curQty))
    realizedAsset += closeQty * (price - curAvg) * Math.sign(curQty)
    realizedAsset -= commission * (closeQty / absDelta)
    const remaining = absDelta - closeQty
    if (remaining === 0) {
      newQty = 0
      newAvg = 0
    } else {
      newQty = curQty + delta
      newAvg = effPrice
    }
  }

  const realizedBase = realizedAsset * rate
  const completedTrade: Trade = { ...trade, realizedPnL: realizedBase }

  let nextPositions: typeof positions
  if (newQty === 0) {
    nextPositions = positions.filter(p => p.symbol !== trade.symbol)
  } else if (idx >= 0) {
    nextPositions = positions.map(p => p.symbol === trade.symbol
      ? {
          ...p,
          quantity: newQty,
          averageCost: newAvg,
          realizedPnL: curRealized + realizedAsset,
          currentPrice: price,
          marketValue: newQty * price,
          unrealizedPnL: newQty * (price - newAvg),
          unrealizedPnLPercent: newAvg !== 0 ? ((price - newAvg) / newAvg) * 100 * Math.sign(newQty) : 0,
          currency: order.currency || p.currency,
          asset: { ...p.asset, currency: order.currency || p.asset.currency },
        }
      : p)
  } else {
    nextPositions = [...positions, {
      symbol: trade.symbol,
      quantity: newQty,
      averageCost: newAvg,
      currentPrice: price,
      marketValue: newQty * price,
      unrealizedPnL: 0,
      unrealizedPnLPercent: 0,
      realizedPnL: 0,
      dayChange: 0,
      dayChangePercent: 0,
      currency: order.currency || 'USD',
      asset: {
        symbol: trade.symbol,
        name: trade.symbol,
        exchange: '',
        currency: order.currency || 'USD',
        type: 'stock' as AssetType,
      },
    }]
  }

  const cashDelta = isBuy ? -trade.totalValue : trade.totalValue

  const orderExists = portfolio.orders.some(o => o.id === order.id)
  const nextOrders = orderExists
    ? portfolio.orders.map(o => o.id === order.id ? order : o)
    : [...portfolio.orders, order]

  return {
    ...portfolio,
    cashBalance: portfolio.cashBalance + cashDelta,
    positions: nextPositions,
    orders: nextOrders,
    tradeHistory: [...portfolio.tradeHistory, completedTrade],
    realizedPnL: (portfolio.realizedPnL ?? 0) + realizedBase,
    updatedAt: Date.now(),
  }
}

export interface SubmitParams {
  portfolio: Portfolio
  order: Order
  quote?: Quote
  settings: PortfolioSettings
}

export async function submitOrder(params: SubmitParams): Promise<Portfolio> {
  const { portfolio, order, quote, settings } = params

  if (quote) {
    const evaluation = evaluateFill(order, quote)
    if (evaluation) {
      const { filledOrder, trade, rate } = await buildFill(order, quote, settings, order.quantity, portfolio)
      return applyTradeToPortfolio(portfolio, trade, filledOrder, rate)
    }
  }

  return {
    ...portfolio,
    orders: [...portfolio.orders, order],
    updatedAt: Date.now(),
  }
}

export async function processPendingOrders(
  portfolio: Portfolio,
  quotes: Record<string, Quote>,
  settings: PortfolioSettings
): Promise<Portfolio> {
  let current = portfolio
  let changed = false

  for (const order of portfolio.orders) {
    if (order.status !== 'pending' && order.status !== 'partially_filled') continue
    const quote = quotes[order.symbol]
    if (!quote) continue
    if (!evaluateFill(order, quote)) continue

    const remaining = order.quantity - order.filledQuantity
    if (remaining <= 0) continue

    const fraction = settings.partialFillEnabled && order.type !== 'market'
      ? 0.25 + Math.random() * 0.75
      : 1
    let fillQty = Math.round(remaining * fraction)
    if (fillQty <= 0) fillQty = remaining
    if (fillQty > remaining) fillQty = remaining

    const { filledOrder, trade, rate } = await buildFill(order, quote, settings, fillQty, current)
    current = applyTradeToPortfolio(current, trade, filledOrder, rate)
    changed = true
  }

  return changed ? current : portfolio
}

export function cancelOrder(portfolio: Portfolio, orderId: string): Portfolio {
  return {
    ...portfolio,
    orders: portfolio.orders.map(o =>
      o.id === orderId ? { ...o, status: 'cancelled', updatedAt: Date.now() } : o
    ),
    updatedAt: Date.now(),
  }
}

export function validateOrderRisk(
  order: Order,
  portfolio: Portfolio,
  quote: Quote,
  settings: PortfolioSettings,
  opts?: { cashAvailable?: number; orderCostBase?: number }
): { valid: boolean; reason?: string } {
  const currentPrice = quote.price
  const orderValue = order.quantity * currentPrice

  const buyActions: OrderAction[] = ['buy', 'buy_to_cover']
  const isBuy = buyActions.includes(order.action)

  if (settings.enforceRiskLimits && !settings.warningOnly) {
    if (settings.defaultOrderSize > 0 && orderValue > settings.defaultOrderSize) {
      return {
        valid: false,
        reason: `Order value (${orderValue.toFixed(2)}) exceeds default order size (${settings.defaultOrderSize.toFixed(2)})`,
      }
    }

    if (settings.maxPositionSize > 0 && orderValue > settings.maxPositionSize) {
      return {
        valid: false,
        reason: `Order value exceeds max position size (${settings.maxPositionSize.toFixed(2)})`,
      }
    }

    if (isBuy && typeof opts?.cashAvailable === 'number' && typeof opts?.orderCostBase === 'number') {
      if (opts.orderCostBase > opts.cashAvailable + 1e-6) {
        return {
          valid: false,
          reason: `Insufficient cash: need ${opts.orderCostBase.toFixed(2)} ${portfolio.baseCurrency}, have ${opts.cashAvailable.toFixed(2)}`,
        }
      }
    }

    if (order.action === 'sell') {
      const position = portfolio.positions.find(p => p.symbol === order.symbol)
      if (!position || position.quantity < order.quantity) {
        return {
          valid: false,
          reason: `Not enough shares to sell (have ${position?.quantity || 0}, want ${order.quantity})`,
        }
      }
    }

    if (isBuy) {
      const existingPositionsValue = portfolio.positions.reduce((sum, p) => sum + p.marketValue, 0)
      const newExposure = existingPositionsValue + orderValue
      const maxExposure = (portfolio.cashBalance + existingPositionsValue) * (settings.maxPortfolioExposure / 100)

      if (settings.maxPortfolioExposure > 0 && newExposure > maxExposure) {
        return {
          valid: false,
          reason: `Portfolio exposure would exceed max (${maxExposure.toFixed(2)})`,
        }
      }

      const position = portfolio.positions.find(p => p.symbol === order.symbol)
      if (position && settings.maxPositionSize > 0) {
        const totalAfterTrade = (position.quantity + order.quantity) * currentPrice
        if (totalAfterTrade > settings.maxPositionSize) {
          return {
            valid: false,
            reason: `Position size after trade would exceed max (${settings.maxPositionSize.toFixed(2)})`,
          }
        }
      }
    }
  }

  return { valid: true }
}
