import type { SlippageModel } from '../../types'

export function simulateSlippage(
  price: number,
  model: SlippageModel
): number {
  switch (model.type) {
    case 'fixed':
      return model.fixedSlippage

    case 'percentage':
      return price * (model.percentageSlippage / 100)

    case 'random': {
      const slippage =
        model.randomMin +
        Math.random() * (model.randomMax - model.randomMin)
      const direction = Math.random() > 0.5 ? 1 : -1
      return price * (slippage / 100) * direction
    }

    default:
      return 0
  }
}

export function defaultSlippageModel(): SlippageModel {
  return {
    type: 'random',
    fixedSlippage: 0.01,
    percentageSlippage: 0.05,
    randomMin: 0.01,
    randomMax: 0.2,
  }
}
