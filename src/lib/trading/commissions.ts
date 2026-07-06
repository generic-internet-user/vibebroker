import type { CommissionModel } from '../../types'

export function calculateCommission(
  quantity: number,
  price: number,
  model: CommissionModel
): number {
  const totalValue = quantity * price

  switch (model.type) {
    case 'fixed':
      return Math.min(Math.max(model.fixedFee, model.minFee), model.maxFee)

    case 'percentage': {
      const fee = totalValue * (model.percentageFee / 100)
      return Math.min(Math.max(fee, model.minFee), model.maxFee)
    }

    case 'tiered': {
      const tier = model.tiers.find(
        (t) => totalValue >= t.minVolume && totalValue <= t.maxVolume
      )
      if (!tier) {
        return Math.min(
          Math.max(totalValue * 0.001, model.minFee),
          model.maxFee
        )
      }
      const fee = tier.isPercentage
        ? totalValue * (tier.fee / 100)
        : tier.fee
      return Math.min(Math.max(fee, model.minFee), model.maxFee)
    }

    default:
      return 0
  }
}

export function defaultCommissionModel(): CommissionModel {
  return {
    type: 'percentage',
    fixedFee: 0,
    percentageFee: 0.1,
    tiers: [],
    minFee: 0.35,
    maxFee: 75,
  }
}
