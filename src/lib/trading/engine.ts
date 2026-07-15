import type { Order, OrderAction, OrderType, Portfolio, Trade, Quote, PortfolioSettings } from '../../types'
import { calculateCommission } from './commissions'
import { simulateSlippage } from './slippage'

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
  notes?: string
  stopLoss?: number
  takeProfit?: number
}): Order {
  orderCounter++
  const now = Date.now()

  return {
    id: `ord_${now}_${orderCounter}`,
    portfolioId: params.portfolioId,
    symbol: params.symbol,
    type: params.type,
    action: params.action,
    quantity: params.quantity,
    price: params.price || 0,
    stopPrice: params.stopPrice,
    limitPrice: params.limitPrice,
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

export function validateOrderRisk(
  order: Order,
  portfolio: Portfolio,
  quote: Quote,
  settings: PortfolioSettings
): { valid: boolean; reason?: string } {
  const currentPrice = quote.price
  const orderValue = order.quantity * currentPrice

  const buyActions: OrderAction[] = ['buy', 'buy_to_cover']
  const isBuy = buyActions.includes(order.action)

  if (settings.enforceRiskLimits && !settings.warningOnly) {
    if (
      settings.defaultOrderSize > 0 &&
      orderValue > settings.defaultOrderSize
    ) {
      return {
        valid: false,
        reason: `Order value (${orderValue.toFixed(2)}) exceeds default order size (${settings.defaultOrderSize.toFixed(2)})`,
      }
    }

    if (
      settings.maxPositionSize > 0 &&
      orderValue > settings.maxPositionSize
    ) {
      return {
        valid: false,
        reason: `Order value exceeds max position size (${settings.maxPositionSize.toFixed(2)})`,
      }
    }

    if (isBuy) {
      const existingPositionsValue = portfolio.positions.reduce(
        (sum, p) => sum + p.marketValue,
        0
      )
      const newExposure = existingPositionsValue + orderValue
      const maxExposure = (portfolio.cashBalance + existingPositionsValue) *
        (settings.maxPortfolioExposure / 100)

      if (
        settings.maxPortfolioExposure > 0 &&
        newExposure > maxExposure
      ) {
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

export function executeOrder(
  order: Order,
  portfolio: Portfolio,
  quote: Quote,
  settings: PortfolioSettings
): { filledOrder: Order; trade: Trade } {
  const currentPrice = quote.price
  const slippage = simulateSlippage(currentPrice, settings.slippageModel)
  const fillPrice = currentPrice + slippage
  const commission = calculateCommission(
    order.quantity,
    fillPrice,
    settings.commissionModel
  )

  const totalCost = order.quantity * fillPrice
  const totalWithCommission = totalCost + commission

  const trade: Trade = {
    id: `trade_${Date.now()}`,
    portfolioId: portfolio.id,
    orderId: order.id,
    symbol: order.symbol,
    action: order.action,
    quantity: order.quantity,
    price: fillPrice,
    commission,
    totalValue: totalWithCommission,
    timestamp: Date.now(),
  }

  const filledOrder: Order = {
    ...order,
    status: 'filled',
    filledQuantity: order.quantity,
    averageFillPrice: fillPrice,
    commission,
    slippage,
    price: fillPrice,
    updatedAt: Date.now(),
  }

  return { filledOrder, trade }
}

export function applyTradeToPortfolio(
  portfolio: Portfolio,
  trade: Trade,
  order: Order
): Portfolio {
  const positions = [...portfolio.positions]
  const idx = positions.findIndex((p) => p.symbol === trade.symbol)

  if (
    order.action === 'buy' ||
    order.action === 'buy_to_cover'
  ) {
    const cost = trade.totalValue
    if (idx >= 0) {
      const pos = positions[idx]
      const totalCost = pos.averageCost * pos.quantity + cost
      const totalQty = pos.quantity + trade.quantity
      positions[idx] = {
        ...pos,
        quantity: totalQty,
        averageCost: totalCost / totalQty,
      }
    } else {
      positions.push({
        symbol: trade.symbol,
        quantity: trade.quantity,
        averageCost: cost / trade.quantity,
        currentPrice: trade.price,
        marketValue: cost,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
        dayChange: 0,
        dayChangePercent: 0,
        asset: {
          symbol: trade.symbol,
          name: trade.symbol,
          exchange: '',
          currency: 'USD',
          type: 'stock',
        },
      })
    }
  } else if (order.action === 'sell' || order.action === 'short_sell') {
    if (idx >= 0) {
      const pos = positions[idx]
      const remaining = pos.quantity - trade.quantity
      const realizedPnL =
        (trade.price - pos.averageCost) * trade.quantity - trade.commission

      if (remaining <= 0) {
        positions.splice(idx, 1)
      } else {
        positions[idx] = {
          ...pos,
          quantity: remaining,
          realizedPnL: pos.realizedPnL + realizedPnL,
        }
      }
    }
  }

  const cashChange =
    order.action === 'buy' || order.action === 'buy_to_cover'
      ? -trade.totalValue
      : trade.totalValue

  const now = Date.now()
  return {
    ...portfolio,
    cashBalance: portfolio.cashBalance + cashChange,
    positions,
    orders: [...portfolio.orders, order],
    tradeHistory: [...portfolio.tradeHistory, trade],
    updatedAt: now,
  }
}
