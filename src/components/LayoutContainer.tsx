import { useState, useEffect, useRef, useCallback } from 'react'
import type { LayoutConfig, LayoutPanel, PanelType, Timeframe, Portfolio } from '../types'
import { Chart } from './Chart'
import { PortfolioView } from './PortfolioView'
import { WatchlistsPanel } from './WatchlistsPanel'
import { BalancePanel } from './BalancePanel'
import { NotesPanel } from './NotesPanel'
import { CalendarPanel } from './CalendarPanel'
import { FloatingPanel } from './FloatingPanel'
import {
  getMonitorSignature,
  getMonitorLabel,
  loadLayoutForMonitor,
  saveLayoutForMonitor,
  clearLayoutForMonitor,
  clampPanels,
  migrateLegacyLayout,
} from '../lib/multiMonitor'

const PRESETS_KEY = 'vibebroker_layout_presets'

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

function initialPanels(sig: string): LayoutPanel[] {
  return clampPanels(migrateLegacyLayout() ?? loadLayoutForMonitor(sig) ?? DEFAULT_PANELS)
}

const DEFAULT_PANELS: LayoutPanel[] = [
  { id: 'chart', type: 'chart', title: 'Chart', x: 0, y: 0, width: 600, height: 500 },
  { id: 'positions', type: 'positions', title: 'Portfolio Status', x: 620, y: 0, width: 500, height: 500 },
]

interface Props {
  portfolio: Portfolio
  onBuy: () => void
  onSell: () => void
  onCancelOrder: (orderId: string) => void
}

const PANEL_LABELS: Record<PanelType, string> = {
  balance: 'Balance',
  chart: 'Chart',
  positions: 'Portfolio Status',
  watchlists: 'Watchlists',
  notes: 'Notes',
  calendar: 'Calendar',
}

export function LayoutContainer({ portfolio, onBuy, onSell, onCancelOrder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [presets, setPresets] = useState<LayoutConfig[]>(loadPresets)
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const [monitorSig, setMonitorSig] = useState<string>(getMonitorSignature())
  const sigRef = useRef(monitorSig)
  const [panels, setPanels] = useState<LayoutPanel[]>(() => initialPanels(getMonitorSignature()))
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
    saveLayoutForMonitor(monitorSig, panels)
  }, [panels, monitorSig])

  useEffect(() => {
    const checkMonitor = () => {
      const sig = getMonitorSignature()
      if (sigRef.current === sig) return
      sigRef.current = sig
      setMonitorSig(sig)
      const next = initialPanels(sig)
      setPanels(next)
      const m: Record<string, number> = {}
      next.forEach((p, i) => { m[p.id] = i + 1 })
      setZMap(m)
      setZCounter(next.length)
      setActivePreset(null)
    }
    const events: (keyof WindowEventMap)[] = ['resize', 'focus']
    events.forEach((e) => window.addEventListener(e, checkMonitor))
    document.addEventListener('visibilitychange', checkMonitor)
    return () => {
      events.forEach((e) => window.removeEventListener(e, checkMonitor))
      document.removeEventListener('visibilitychange', checkMonitor)
    }
  }, [])

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
      title: PANEL_LABELS[type],
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
      p.id === id ? { ...p, type, title: PANEL_LABELS[type] } : p
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

  const resetLayout = () => {
    clearLayoutForMonitor(monitorSig)
    const next = clampPanels(DEFAULT_PANELS)
    setPanels(next)
    setActivePreset(null)
    const m: Record<string, number> = {}
    next.forEach((p, i) => { m[p.id] = i + 1 })
    setZMap(m)
    setZCounter(next.length)
  }

  const handleSetPreset = (id: string | null) => {
    if (!id) {
      resetLayout()
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
        onSymbolChange={(s) => setPanelSymbol(panel.id, s)}
        portfolioId={portfolio.id}
      />
    ),
    watchlists: () => <WatchlistsPanel />,
    positions: () => <PortfolioView portfolio={portfolio} onBuy={onBuy} onSell={onSell} onCancelOrder={onCancelOrder} />,
    notes: () => <NotesPanel portfolio={portfolio} />,
    calendar: () => <CalendarPanel />,
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
          <option value="calendar">Calendar</option>
        </select>
        <button className="btn-sm" onClick={() => setShowManage(true)}>Save</button>
        <button className="btn-sm" onClick={resetLayout} title="Reset layout for this monitor">Reset</button>
        <span className="text-sm text-muted" title="Layout is saved per monitor; undocking restores a default layout">
          {getMonitorLabel(monitorSig)}
        </span>
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
