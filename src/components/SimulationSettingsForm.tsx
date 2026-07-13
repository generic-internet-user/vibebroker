import type {
  PortfolioSettings,
  CommissionModelType,
  SlippageModelType,
  SpreadModelType,
  ExecutionModel,
} from '../types'

interface Props {
  value: PortfolioSettings
  onChange: (settings: PortfolioSettings) => void
}

const num = (v: number) => (isNaN(v) ? 0 : v)

export function SimulationSettingsForm({ value, onChange }: Props) {
  const set = (patch: Partial<PortfolioSettings>) => onChange({ ...value, ...patch })
  const setCommission = (patch: Partial<PortfolioSettings['commissionModel']>) =>
    onChange({ ...value, commissionModel: { ...value.commissionModel, ...patch } })
  const setSlippage = (patch: Partial<PortfolioSettings['slippageModel']>) =>
    onChange({ ...value, slippageModel: { ...value.slippageModel, ...patch } })
  const setSpread = (patch: Partial<PortfolioSettings['spreadModel']>) =>
    onChange({ ...value, spreadModel: { ...value.spreadModel, ...patch } })

  return (
    <div>
      <div className="panel-header" style={{ marginTop: 4 }}>Risk Limits</div>
      <div className="form-row">
        <label>Enforce Risk Limits</label>
        <input
          type="checkbox"
          checked={value.enforceRiskLimits}
          onChange={(e) => set({ enforceRiskLimits: e.target.checked })}
          style={{ height: 'auto', width: 'auto' }}
        />
      </div>
      <div className="form-row">
        <label>Warning Only</label>
        <input
          type="checkbox"
          checked={value.warningOnly}
          onChange={(e) => set({ warningOnly: e.target.checked })}
          style={{ height: 'auto', width: 'auto' }}
        />
        <span className="hint">If enforced, warn instead of blocking</span>
      </div>
      <div className="form-row">
        <label>Default Order Size</label>
        <input
          type="number"
          value={value.defaultOrderSize}
          onChange={(e) => set({ defaultOrderSize: num(parseFloat(e.target.value)) })}
          step="1000"
        />
      </div>
      <div className="form-row">
        <label>Max Position Size</label>
        <input
          type="number"
          value={value.maxPositionSize}
          onChange={(e) => set({ maxPositionSize: num(parseFloat(e.target.value)) })}
          step="1000"
        />
      </div>
      <div className="form-row">
        <label>Max Portfolio Exposure %</label>
        <input
          type="number"
          value={value.maxPortfolioExposure}
          onChange={(e) => set({ maxPortfolioExposure: num(parseFloat(e.target.value)) })}
          step="5"
        />
      </div>
      <div className="form-row">
        <label>Default Stop Loss %</label>
        <input
          type="number"
          value={value.defaultStopLoss}
          onChange={(e) => set({ defaultStopLoss: num(parseFloat(e.target.value)) })}
          step="0.5"
        />
      </div>
      <div className="form-row">
        <label>Default Take Profit %</label>
        <input
          type="number"
          value={value.defaultTakeProfit}
          onChange={(e) => set({ defaultTakeProfit: num(parseFloat(e.target.value)) })}
          step="0.5"
        />
      </div>

      <div className="panel-header" style={{ marginTop: 8 }}>Order Fill Simulation</div>
      <div className="form-row">
        <label>Execution Model</label>
        <select
          value={value.executionModel}
          onChange={(e) => set({ executionModel: e.target.value as ExecutionModel })}
        >
          <option value="open">Fill at open</option>
          <option value="close">Fill at close</option>
          <option value="intrabar">Fill intrabar</option>
          <option value="conservative">Conservative</option>
        </select>
      </div>
      <div className="form-row">
        <label>Partial Fills</label>
        <input
          type="checkbox"
          checked={value.partialFillEnabled}
          onChange={(e) => set({ partialFillEnabled: e.target.checked })}
          style={{ height: 'auto', width: 'auto' }}
        />
      </div>
      <div className="form-row">
        <label>Currency Conv. Fee %</label>
        <input
          type="number"
          value={value.currencyConversionFee}
          onChange={(e) => set({ currencyConversionFee: num(parseFloat(e.target.value)) })}
          step="0.1"
        />
      </div>

      <div className="panel-header" style={{ marginTop: 8 }}>Commission Model</div>
      <div className="form-row">
        <label>Type</label>
        <select
          value={value.commissionModel.type}
          onChange={(e) => setCommission({ type: e.target.value as CommissionModelType })}
        >
          <option value="fixed">Fixed fee</option>
          <option value="percentage">Percentage fee</option>
          <option value="tiered">Tiered fee</option>
        </select>
      </div>
      <div className="form-row">
        <label>Fixed Fee</label>
        <input
          type="number"
          value={value.commissionModel.fixedFee}
          onChange={(e) => setCommission({ fixedFee: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Percentage Fee %</label>
        <input
          type="number"
          value={value.commissionModel.percentageFee}
          onChange={(e) => setCommission({ percentageFee: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Min Fee</label>
        <input
          type="number"
          value={value.commissionModel.minFee}
          onChange={(e) => setCommission({ minFee: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Max Fee</label>
        <input
          type="number"
          value={value.commissionModel.maxFee}
          onChange={(e) => setCommission({ maxFee: num(parseFloat(e.target.value)) })}
          step="1"
        />
      </div>

      <div className="panel-header" style={{ marginTop: 8 }}>Slippage Model</div>
      <div className="form-row">
        <label>Type</label>
        <select
          value={value.slippageModel.type}
          onChange={(e) => setSlippage({ type: e.target.value as SlippageModelType })}
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
          <option value="random">Random within bounds</option>
        </select>
      </div>
      <div className="form-row">
        <label>Fixed Slippage</label>
        <input
          type="number"
          value={value.slippageModel.fixedSlippage}
          onChange={(e) => setSlippage({ fixedSlippage: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Percentage Slippage %</label>
        <input
          type="number"
          value={value.slippageModel.percentageSlippage}
          onChange={(e) => setSlippage({ percentageSlippage: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Random Min</label>
        <input
          type="number"
          value={value.slippageModel.randomMin}
          onChange={(e) => setSlippage({ randomMin: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Random Max</label>
        <input
          type="number"
          value={value.slippageModel.randomMax}
          onChange={(e) => setSlippage({ randomMax: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>

      <div className="panel-header" style={{ marginTop: 8 }}>Spread Model</div>
      <div className="form-row">
        <label>Type</label>
        <select
          value={value.spreadModel.type}
          onChange={(e) => setSpread({ type: e.target.value as SpreadModelType })}
        >
          <option value="fixed">Fixed</option>
          <option value="percentage">Percentage</option>
        </select>
      </div>
      <div className="form-row">
        <label>Fixed Spread</label>
        <input
          type="number"
          value={value.spreadModel.fixedSpread}
          onChange={(e) => setSpread({ fixedSpread: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
      <div className="form-row">
        <label>Percentage Spread %</label>
        <input
          type="number"
          value={value.spreadModel.percentageSpread}
          onChange={(e) => setSpread({ percentageSpread: num(parseFloat(e.target.value)) })}
          step="0.01"
        />
      </div>
    </div>
  )
}
