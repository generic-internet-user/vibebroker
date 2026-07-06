import { savePortfolio, getState, getCurrentPortfolio } from '../store.js';
import { getPortfolio } from './portfolio-service.js';
import { uid, deepClone } from '../utils/helpers.js';
import { ORDER_TYPES, ORDER_ACTIONS, ORDER_STATUS } from '../utils/constants.js';

export async function placeOrder(portfolioId, order) {
  const portfolio = await getPortfolio(portfolioId);
  if (!portfolio) throw new Error('Portfolio not found');

  const fullOrder = {
    id: uid(),
    portfolioId,
    symbol: order.symbol.toUpperCase(),
    type: order.type || ORDER_TYPES.MARKET,
    action: order.action,
    quantity: order.quantity || 0,
    price: order.price || null,
    stopPrice: order.stopPrice || null,
    limitPrice: order.limitPrice || null,
    status: ORDER_STATUS.PENDING,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    filledQuantity: 0,
    filledAmount: 0,
    commission: 0,
    notes: order.notes || '',
    takeProfit: order.takeProfit || null,
    stopLoss: order.stopLoss || null,
  };

  // Validate
  if (fullOrder.quantity <= 0) throw new Error('Quantity must be positive');
  if (![ORDER_ACTIONS.BUY, ORDER_ACTIONS.SELL, ORDER_ACTIONS.SHORT_SELL, ORDER_ACTIONS.BUY_TO_COVER].includes(fullOrder.action)) {
    throw new Error('Invalid order action');
  }

  // Market orders execute immediately
  if (fullOrder.type === ORDER_TYPES.MARKET) {
    return await executeOrder(portfolio, fullOrder, order.marketPrice);
  }

  // Limit, stop, stop-limit are pending
  portfolio.orders.push(fullOrder);
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
  return fullOrder;
}

export async function executeOrder(portfolio, order, marketPrice) {
  const { calculateCommission, simulateSlippage, simulateSpread } = await import('./simulation.js');

  const price = simulateSlippage(
    marketPrice,
    portfolio.settings.slippage,
    order.action === ORDER_ACTIONS.BUY || order.action === ORDER_ACTIONS.BUY_TO_COVER ? 'buy' : 'sell'
  );

  const spreadPrice = simulateSpread(
    price,
    portfolio.settings.spread,
    order.action === ORDER_ACTIONS.BUY || order.action === ORDER_ACTIONS.BUY_TO_COVER ? 'buy' : 'sell'
  );

  const filledPrice = spreadPrice;
  const quantity = order.quantity;
  const grossAmount = filledPrice * quantity;
  const commission = calculateCommission(grossAmount, portfolio.settings.commissionModel);

  // Check cash for buy orders
  const totalCost = grossAmount + commission;
  if ((order.action === ORDER_ACTIONS.BUY || order.action === ORDER_ACTIONS.BUY_TO_COVER) && totalCost > portfolio.cash) {
    // Partial fill
    const maxShares = Math.floor((portfolio.cash - commission) / filledPrice);
    if (maxShares <= 0) {
      order.status = ORDER_STATUS.REJECTED;
      order.updatedAt = Date.now();
      portfolio.orders.push(order);
      portfolio.updatedAt = Date.now();
      await savePortfolio(portfolio);
      return order;
    }
    order.filledQuantity = maxShares;
    order.filledAmount = filledPrice * maxShares;
    order.commission = calculateCommission(filledPrice * maxShares, portfolio.settings.commissionModel);
    order.status = ORDER_STATUS.PARTIALLY_FILLED;
  } else {
    order.filledQuantity = quantity;
    order.filledAmount = grossAmount;
    order.commission = commission;
    order.status = ORDER_STATUS.FILLED;
  }

  // Execute trade
  const trade = {
    id: uid(),
    portfolioId: portfolio.id,
    symbol: order.symbol,
    action: order.action,
    quantity: order.filledQuantity,
    price: filledPrice,
    grossAmount: order.filledAmount,
    commission: order.commission,
    totalAmount: order.filledAmount + order.commission,
    timestamp: Date.now(),
  };

  // Update portfolio
  if (order.action === ORDER_ACTIONS.BUY) {
    portfolio.cash -= trade.totalAmount;
    const existing = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (existing) {
      const totalShares = existing.shares + trade.quantity;
      existing.avgCost = (existing.avgCost * existing.shares + filledPrice * trade.quantity) / totalShares;
      existing.shares = totalShares;
    } else {
      portfolio.holdings.push({ symbol: order.symbol, shares: trade.quantity, avgCost: filledPrice });
    }
  } else if (order.action === ORDER_ACTIONS.SELL) {
    const holding = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (!holding) throw new Error('No shares to sell');
    if (holding.shares < trade.quantity) throw new Error('Insufficient shares');
    holding.shares -= trade.quantity;
    portfolio.cash += trade.totalAmount - trade.commission;
    if (holding.shares === 0) {
      portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== order.symbol);
    }
  } else if (order.action === ORDER_ACTIONS.SHORT_SELL) {
    portfolio.cash += trade.totalAmount - trade.commission;
    const existing = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (existing) {
      existing.shortShares = (existing.shortShares || 0) + trade.quantity;
      existing.shortAvgCost = filledPrice;
    } else {
      portfolio.holdings.push({ symbol: order.symbol, shares: 0, avgCost: 0, shortShares: trade.quantity, shortAvgCost: filledPrice });
    }
  } else if (order.action === ORDER_ACTIONS.BUY_TO_COVER) {
    const holding = portfolio.holdings.find(h => h.symbol === order.symbol);
    if (!holding) throw new Error('No short position');
    const shortShares = holding.shortShares || 0;
    if (shortShares < trade.quantity) throw new Error('Insufficient short shares to cover');
    holding.shortShares = shortShares - trade.quantity;
    portfolio.cash -= trade.totalAmount;
    if (holding.shortShares <= 0) {
      delete holding.shortShares;
      delete holding.shortAvgCost;
    }
    if (holding.shares === 0 && !holding.shortShares) {
      portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== order.symbol);
    }
  }

  portfolio.trades.push(trade);
  order.updatedAt = Date.now();
  portfolio.orders.push(order);
  portfolio.updatedAt = Date.now();

  await savePortfolio(portfolio);
  return order;
}

export async function cancelOrder(portfolioId, orderId) {
  const portfolio = await getPortfolio(portfolioId);
  if (!portfolio) throw new Error('Portfolio not found');

  const order = portfolio.orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== ORDER_STATUS.PENDING) throw new Error('Can only cancel pending orders');

  order.status = ORDER_STATUS.CANCELLED;
  order.updatedAt = Date.now();
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
  return order;
}

export async function editOrder(portfolioId, orderId, updates) {
  const portfolio = await getPortfolio(portfolioId);
  if (!portfolio) throw new Error('Portfolio not found');

  const order = portfolio.orders.find(o => o.id === orderId);
  if (!order) throw new Error('Order not found');
  if (order.status !== ORDER_STATUS.PENDING) throw new Error('Can only edit pending orders');

  Object.assign(order, updates);
  order.updatedAt = Date.now();
  portfolio.updatedAt = Date.now();
  await savePortfolio(portfolio);
  return order;
}
