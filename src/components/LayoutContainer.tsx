import { useState, useEffect } from 'react'
import type { LayoutConfig, LayoutPanel, PanelType, Timeframe, Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { Chart } from './Chart'
import { PortfolioView } from './PortfolioView'
import { WatchlistsPanel } from './WatchlistsPanel'

const STORAGE_KEY = 'vibebroker_layout_presets'

function loadPresets(): LayoutConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function savePresets(presets: LayoutConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
}

const DEFAULT_PANELS: LayoutPanel[] = [
  { id: 'chart', type: 'chart', title: 'Chart', width: 1, height: 1 },
  { id: 'positions', type: 'positions', title: 'Positions', width: 1, height: 1 },
]

interface Props {
  portfolio: Portfolio
  onBuy: () => void
  onSell: () => void
}

export function LayoutContainer({ portfolio, onBuy, onSell }: Props) {
  const { state, dispatch } = useApp()
  const [presets, setPresets] = useState<LayoutConfig[]>(loadPresets)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [panels, setPanels] = useState<LayoutPanel[]>(DEFAULT_PANELS)
  const [showManage, setShowManage] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [chartTimeframes, setChartTimeframes] = useState<Record<string, any>>({})

  useEffect(() => {
    if (activePreset) {
      const preset = presets.find(p => p.id === activePreset)
      if (preset) {
        setPanels(preset.panels)
      }
    }
  }, [activePreset, presets])

  const addPanel = (type: PanelType) => {
    const id = `panel_${Date.now()}`
    const newPanel: LayoutPanel = {
      id,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      width: 1,
      height: 1,
    }
    setPanels(prev => [...prev, newPanel])
  }

  const removePanel = (id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id))
  }

  const changePanelType = (id: string, type: PanelType) => {
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, type, title: type.charAt(0).toUpperCase() + type.slice(1) } : p
    ))
  }

  const savePreset = () => {
    if (!presetName.trim()) return
    const preset: LayoutConfig = {
      id: `preset_${Date.now()}`,
      name: presetName.trim(),
      panels: [...panels],
    }
    const updated = [...presets, preset]
    setPresets(updated)
    savePresets(updated)
    setActivePreset(preset.id)
    setPresetName('')
    setShowManage(false)
  }

  const deletePreset = (id: string) => {
    const updated = presets.filter(p => p.id !== id)
    setPresets(updated)
    savePresets(updated)
    if (activePreset === id) setActivePreset(null)
  }

  const handleSetPreset = (id: string | null) => {
    if (!id) {
      setPanels(DEFAULT_PANELS)
      setActivePreset(null)
      return
    }
    setActivePreset(id)
  }

  const chartPanels = panels.filter(p => p.type === 'chart')
  const nonChartPanels = panels.filter(p => p.type !== 'chart')
  const panelComponents: Record<PanelType, React.ReactNode> = {
    positions: <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    orders: <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    history: <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    performance: <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    notes: <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    chart: null,
    watchlists: <WatchlistsPanel />,
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center gap-1 mb-1" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 4, minHeight: 28, flexWrap: 'wrap' }}>
        <span className="text-sm text-muted" style={{ marginRight: 4 }}>Layout:</span>
        <button className={`btn-sm ${!activePreset ? 'btn-primary' : ''}`} onClick={() => handleSetPreset(null)}>Default</button>
        {presets.map(p => (
          <button
            key={p.id}
            className={`btn-sm ${activePreset === p.id ? 'btn-primary' : ''}`}
            onClick={() => handleSetPreset(p.id)}
          >
            {p.name}
          </button>
        ))}
        <span className="spacer" />
        <select
          className="btn-sm"
          value=""
          onChange={(e) => {
            if (e.target.value) addPanel(e.target.value as PanelType)
            e.target.value = ''
          }}
          style={{ height: 24, fontSize: 12 }}
        >
          <option value="">+ Add Panel</option>
          <option value="chart">Chart</option>
          <option value="positions">Positions</option>
          <option value="orders">Orders</option>
          <option value="history">History</option>
          <option value="performance">Performance</option>
          <option value="watchlists">Watchlists</option>
          <option value="notes">Notes</option>
        </select>
        <button className="btn-sm" onClick={() => setShowManage(true)}>Save</button>
      </div>

      <div className="flex-1" style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {chartPanels.length > 0 && (
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {chartPanels.map(panel => (
              <div key={panel.id} className="panel" style={{ flex: 1, minWidth: 400, minHeight: 400 }}>
                <div className="panel-header">
                  <span>{panel.title}</span>
                  <div className="flex gap-1">
                    <select
                      value={panel.type}
                      onChange={(e) => changePanelType(panel.id, e.target.value as PanelType)}
                      style={{ height: 20, fontSize: 11 }}
                    >
                      <option value="chart">Chart</option>
                      <option value="positions">Positions</option>
                      <option value="orders">Orders</option>
                      <option value="history">History</option>
                      <option value="performance">Performance</option>
                      <option value="watchlists">Watchlists</option>
                      <option value="notes">Notes</option>
                    </select>
                    <button className="btn-sm" onClick={() => removePanel(panel.id)}>&times;</button>
                  </div>
                </div>
                <div className="panel-body" style={{ padding: 0 }}>
                  <Chart
                    symbol={panel.symbol || (portfolio.positions[0]?.symbol || 'AAPL')}
                    timeframe={chartTimeframes[panel.id] || '1M'}
                    onTimeframeChange={(tf) => setChartTimeframes(prev => ({ ...prev, [panel.id]: tf }))}
                    portfolioId={portfolio.id}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {nonChartPanels.length > 0 && (
          <div className="grid-2 gap-2">
            {nonChartPanels.map(panel => (
              <div key={panel.id} className="panel">
                <div className="panel-header">
                  <span>{panel.title}</span>
                  <div className="flex gap-1">
                    <select
                      value={panel.type}
                      onChange={(e) => changePanelType(panel.id, e.target.value as PanelType)}
                      style={{ height: 20, fontSize: 11 }}
                    >
                      <option value="chart">Chart</option>
                      <option value="positions">Positions</option>
                      <option value="orders">Orders</option>
                      <option value="history">History</option>
                      <option value="performance">Performance</option>
                      <option value="watchlists">Watchlists</option>
                      <option value="notes">Notes</option>
                    </select>
                    <button className="btn-sm" onClick={() => removePanel(panel.id)}>&times;</button>
                  </div>
                </div>
                <div className="panel-body">
                  {panel.type === 'watchlists' ? <WatchlistsPanel /> : (
                    <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {panels.length === 0 && (
          <div className="empty-state">No panels. Add one using the dropdown above.</div>
        )}
      </div>

      {showManage && (
        <div className="modal-overlay" onClick={() => setShowManage(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span>Save Layout Preset</span>
              <button onClick={() => setShowManage(false)}>&times;</button>
            </div>
            <div className="modal-body">
              {presets.length > 0 && (
                <div className="mb-2">
                  <div className="text-sm text-muted mb-1">Existing presets:</div>
                  {presets.map(p => (
                    <div key={p.id} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                      <span>{p.name}</span>
                      <button className="btn-sm" onClick={() => deletePreset(p.id)}>Delete</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="form-row">
                <label>Preset Name</label>
                <input
                  type="text"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && savePreset()}
                  autoFocus
                />
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowManage(false)}>Cancel</button>
                <button className="btn-primary" onClick={savePreset}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
