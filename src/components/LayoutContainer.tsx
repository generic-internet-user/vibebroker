import { useState, useEffect, useRef, useCallback } from 'react'
import type { LayoutConfig, LayoutPanel, PanelType, Timeframe, Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { Chart } from './Chart'
import { PortfolioView } from './PortfolioView'
import { WatchlistsPanel } from './WatchlistsPanel'
import { BalancePanel } from './BalancePanel'
import { NotesPanel } from './NotesPanel'
import { FloatingPanel } from './FloatingPanel'

const PRESETS_KEY = 'vibebroker_layout_presets'
const CURRENT_KEY = 'vibebroker_layout_current'

function loadPresets(): LayoutConfig[] {
  try {
    const saved = localStorage.getItem(PRESETS_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function savePresets(presets: LayoutConfig[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
}

function loadCurrentPanels(): LayoutPanel[] | null {
  try {
    const saved = localStorage.getItem(CURRENT_KEY)
    return saved ? JSON.parse(saved) : null
  } catch {
    return null
  }
}

function saveCurrentPanels(panels: LayoutPanel[]) {
  localStorage.setItem(CURRENT_KEY, JSON.stringify(panels))
}

function clearCurrentPanels() {
  localStorage.removeItem(CURRENT_KEY)
}

const DEFAULT_PANELS: LayoutPanel[] = [
  { id: 'chart', type: 'chart', title: 'Chart', x: 0, y: 0, width: 600, height: 500 },
  { id: 'positions', type: 'positions', title: 'Positions', x: 620, y: 0, width: 500, height: 500 },
]

interface Props {
  portfolio: Portfolio
  onBuy: () => void
  onSell: () => void
}

export function LayoutContainer({ portfolio, onBuy, onSell }: Props) {
  const { state, dispatch } = useApp()
  const containerRef = useRef<HTMLDivElement>(null)
  const [presets, setPresets] = useState<LayoutConfig[]>(loadPresets)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [panels, setPanels] = useState<LayoutPanel[]>(() => {
    return loadCurrentPanels() ?? DEFAULT_PANELS
  })
  const [showManage, setShowManage] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [chartTimeframes, setChartTimeframes] = useState<Record<string, Timeframe>>({})
  const [zCounter, setZCounter] = useState(panels.length)
  const [zMap, setZMap] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {}
    panels.forEach((p, i) => { m[p.id] = i + 1 })
    return m
  })
  const initialRender = useRef(true)

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false
      return
    }
    saveCurrentPanels(panels)
  }, [panels])

  useEffect(() => {
    if (activePreset) {
      const preset = presets.find(p => p.id === activePreset)
      if (preset) {
        setPanels(preset.panels)
        const m: Record<string, number> = {}
        preset.panels.forEach((p, i) => { m[p.id] = i + 1 })
        setZMap(m)
        setZCounter(preset.panels.length)
      }
    }
  }, [activePreset, presets])

  const addPanel = useCallback((type: PanelType) => {
    const id = `panel_${Date.now()}`
    const offset = panels.length * 30
    const newPanel: LayoutPanel = {
      id,
      type,
      title: type.charAt(0).toUpperCase() + type.slice(1),
      x: 20 + offset,
      y: 20 + offset,
      width: 500,
      height: 400,
    }
    setPanels(prev => [...prev, newPanel])
    const n = zCounter + 1
    setZCounter(n)
    setZMap(prev => ({ ...prev, [id]: n }))
  }, [panels.length, zCounter])

  const removePanel = useCallback((id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id))
  }, [])

  const changePanelType = useCallback((id: string, type: PanelType) => {
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, type, title: type.charAt(0).toUpperCase() + type.slice(1) } : p
    ))
  }, [])

  const setPanelSymbol = useCallback((id: string, symbol: string) => {
    setPanels(prev => prev.map(p =>
      p.id === id ? { ...p, symbol: symbol.toUpperCase() } : p
    ))
  }, [])

  const movePanel = useCallback((id: string, x: number, y: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }, [])

  const resizePanel = useCallback((id: string, w: number, h: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, width: w, height: h } : p))
  }, [])

  const focusPanel = useCallback((id: string) => {
    setZMap(prev => {
      if (prev[id] === zCounter) return prev
      const n = zCounter + 1
      setZCounter(n)
      return { ...prev, [id]: n }
    })
  }, [zCounter])

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
      clearCurrentPanels()
      setActivePreset(null)
      const m: Record<string, number> = {}
      DEFAULT_PANELS.forEach((p, i) => { m[p.id] = i + 1 })
      setZMap(m)
      setZCounter(DEFAULT_PANELS.length)
      return
    }
    setActivePreset(id)
  }

  const panelComponents: Record<PanelType, (panel: LayoutPanel) => React.ReactNode> = {
    balance: () => <BalancePanel portfolio={portfolio} />,
    chart: (panel) => (
      <Chart
        symbol={panel.symbol || (portfolio.positions[0]?.symbol || 'AAPL')}
        timeframe={chartTimeframes[panel.id] || '1M'}
        onTimeframeChange={(tf) => setChartTimeframes(prev => ({ ...prev, [panel.id]: tf }))}
        portfolioId={portfolio.id}
      />
    ),
    watchlists: () => <WatchlistsPanel />,
    positions: () => <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} />,
    notes: () => <NotesPanel portfolio={portfolio} />,
  }

  return (
    <div className="flex flex-col" style={{ height: '100%' }}>
      <div className="flex items-center gap-1 mb-1" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: 4, minHeight: 28, flexWrap: 'wrap' }}>
        <select
          className="btn-sm"
          value={activePreset || ''}
          onChange={(e) => handleSetPreset(e.target.value || null)}
          style={{ height: 24, fontSize: 12 }}
        >
          <option value="">Default Layout</option>
          {presets.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
          <option value="balance">Balance</option>
          <option value="chart">Chart</option>
          <option value="positions">Portfolio Status</option>
          <option value="watchlists">Watchlists</option>
          <option value="notes">Notes</option>
        </select>
        <button className="btn-sm" onClick={() => setShowManage(true)}>Save</button>
      </div>

      <div
        ref={containerRef}
        className="layout-workspace"
      >
        {panels.map(panel => (
          <FloatingPanel
            key={panel.id}
            id={panel.id}
            title={panel.title}
            type={panel.type}
            x={panel.x}
            y={panel.y}
            width={panel.width}
            height={panel.height}
            zIndex={zMap[panel.id] || 1}
            containerRef={containerRef}
            onMove={movePanel}
            onResize={resizePanel}
            onChangeType={changePanelType}
            onClose={removePanel}
            onFocus={focusPanel}
          >
            {panelComponents[panel.type]?.(panel)}
          </FloatingPanel>
        ))}
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
