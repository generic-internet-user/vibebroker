import type { PortfolioSettings, SpreadModel } from '../../types'

export function defaultPortfolioSettings(): PortfolioSettings {
  return {
    commissionModel: {
      type: 'percentage',
      fixedFee: 0,
      percentageFee: 0.1,
      tiers: [],
      minFee: 0.35,
      maxFee: 75,
    },
    slippageModel: {
      type: 'random',
      fixedSlippage: 0.01,
      percentageSlippage: 0.05,
      randomMin: 0.01,
      randomMax: 0.2,
    },
    spreadModel: {
      type: 'percentage',
      fixedSpread: 0.01,
      percentageSpread: 0.05,
    },
    executionModel: 'intrabar',
    defaultOrderSize: 10000,
    maxPositionSize: 50000,
    maxPortfolioExposure: 80,
    defaultStopLoss: 5,
    defaultTakeProfit: 10,
    enforceRiskLimits: true,
    warningOnly: false,
    currencyConversionFee: 0.5,
    partialFillEnabled: true,
    enableForking: true,
    enableUndoRedo: true,
    undoWarningEnabled: true,
  }
}

export function calculateSpread(
  price: number,
  model: SpreadModel
): { bid: number; ask: number } {
  const spread =
    model.type === 'fixed'
      ? model.fixedSpread
      : price * (model.percentageSpread / 100)

  return {
    bid: price - spread / 2,
    ask: price + spread / 2,
  }
}

export {
  createOrder,
  evaluateFill,
  applyTradeToPortfolio,
  submitOrder,
  processPendingOrders,
  cancelOrder,
  validateOrderRisk,
} from './engine'
export { calculateCommission, defaultCommissionModel } from './commissions'
export { simulateSlippage, defaultSlippageModel } from './slippage'
