import { COMMISSION_MODELS, SLIPPAGE_MODELS, SPREAD_MODELS } from '../utils/constants.js';

export function calculateCommission(grossAmount, model) {
  if (!model) return 0;
  switch (model.type) {
    case COMMISSION_MODELS.FIXED:
      return model.value || 0;
    case COMMISSION_MODELS.PERCENTAGE:
      return grossAmount * (model.value || 0);
    case COMMISSION_MODELS.TIERED: {
      const tiers = model.tiers || [];
      if (tiers.length === 0) return 0;
      const sorted = [...tiers].sort((a, b) => a.min - b.min);
      const tier = sorted.find(t => grossAmount >= t.min && grossAmount <= (t.max || Infinity));
      if (!tier) return 0;
      return tier.fixed + grossAmount * tier.rate;
    }
    default:
      return 0;
  }
}

export function simulateSlippage(price, model, side) {
  if (!model || !model.type) return price;
  switch (model.type) {
    case SLIPPAGE_MODELS.FIXED:
      return side === 'buy' ? price + (model.value || 0) : price - (model.value || 0);
    case SLIPPAGE_MODELS.PERCENTAGE:
      return side === 'buy'
        ? price * (1 + (model.value || 0))
        : price * (1 - (model.value || 0));
    case SLIPPAGE_MODELS.RANDOM: {
      const min = model.min || 0;
      const max = model.max || 0;
      const slippage = min + Math.random() * (max - min);
      return side === 'buy' ? price * (1 + slippage) : price * (1 - slippage);
    }
    default:
      return price;
  }
}

export function simulateSpread(price, model, side) {
  if (!model || !model.type) return price;
  switch (model.type) {
    case SPREAD_MODELS.FIXED:
      return side === 'buy' ? price + (model.value || 0) : price - (model.value || 0);
    case SPREAD_MODELS.PERCENTAGE:
      return side === 'buy'
        ? price * (1 + (model.value || 0))
        : price * (1 - (model.value || 0));
    default:
      return price;
  }
}

export function getDefaultSimulationConfig() {
  return {
    commission: { type: COMMISSION_MODELS.FIXED, value: 0 },
    slippage: {
      type: SLIPPAGE_MODELS.PERCENTAGE,
      value: 0.001,
      min: 0.0005,
      max: 0.003,
    },
    spread: { type: SPREAD_MODELS.PERCENTAGE, value: 0.0005 },
    executionModel: 'conservative',
  };
}
