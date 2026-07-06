import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import { Modal } from './Modals'
import type { Provider, UseCase } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  activePortfolioId?: string
  onExportSingle?: () => void
  onExportAll?: () => void
  onExportCSV?: () => void
  onImport?: () => void
}

const PROVIDER_LABELS: Record<Provider, string> = {
  finnhub: 'Finnhub',
  twelvedata: 'Twelve Data',
}

const PROVIDER_NOTES: Record<Provider, string> = {
  finnhub: 'Real-time quotes, 60 req/min free. No free candles.',
  twelvedata: '800 candle req/day free, 8 req/min.',
}

const USECASE_LABELS: Record<UseCase, string> = {
  quote: 'Real-time Quotes',
  profile: 'Company Profiles',
  candles: 'Historical Candles',
  search: 'Symbol Search',
}

const ALL_PROVIDERS: Provider[] = ['finnhub', 'twelvedata']

export function SettingsDialog({ open, onClose, activePortfolioId, onExportSingle, onExportAll, onExportCSV, onImport }: Props) {
  const { state, dispatch } = useApp()
  const [localSettings, setLocalSettings] = useState(state.settings)
  const [activeTab, setActiveTab] = useState('API Keys')

  useEffect(() => {
    setLocalSettings(state.settings)
  }, [state.settings, open])

  const save = () => {
    dispatch({ type: 'SET_SETTINGS', settings: localSettings })
    onClose()
  }

  if (!open) return null

  const tabs = ['API Keys', 'General', 'Display', 'Simulation', 'Export/Import', 'Providers']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <>
          <button onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </>
      }
    >
      <div className="tab-bar">
        {tabs.map(t => (
          <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'API Keys' && (
        <div>
          <div className="form-row">
            <label>Finnhub API Key</label>
            <input
              type="password"
              value={localSettings.finnhubApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, finnhubApiKey: e.target.value })}
              placeholder="Get from finnhub.io"
            />
          </div>
          <div className="form-row">
            <label>Twelve Data API Key</label>
            <input
              type="password"
              value={localSettings.twelveDataApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, twelveDataApiKey: e.target.value })}
              placeholder="Get from twelvedata.com"
            />
          </div>
          <div className="form-row">
            <label>ExchangeRate-API Key</label>
            <input
              type="password"
              value={localSettings.exchangeRateApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, exchangeRateApiKey: e.target.value })}
              placeholder="Get from exchangerate-api.com"
            />
          </div>
          <div className="text-muted text-sm mt-2">
            API keys are stored in your browser's localStorage. No data is sent to any server except the API providers you configure.
          </div>
        </div>
      )}

      {activeTab === 'General' && (
        <div>
          <div className="form-row">
            <label>Default Currency</label>
            <select
              value={localSettings.defaultCurrency}
              onChange={(e) => setLocalSettings({ ...localSettings, defaultCurrency: e.target.value })}
            >
              {['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Currency Conv. Fee (%)</label>
            <input
              type="number"
              value={localSettings.globalCurrencyConversionFee}
              onChange={(e) => setLocalSettings({ ...localSettings, globalCurrencyConversionFee: parseFloat(e.target.value) || 0 })}
              step="0.1"
            />
          </div>
          <div className="form-row">
            <label>Time Zone</label>
            <input
              type="text"
              value={localSettings.timeZone}
              onChange={(e) => setLocalSettings({ ...localSettings, timeZone: e.target.value })}
            />
          </div>
          <div className="form-row">
            <label>Date Format</label>
            <input
              type="text"
              value={localSettings.dateFormat}
              onChange={(e) => setLocalSettings({ ...localSettings, dateFormat: e.target.value })}
            />
          </div>
        </div>
      )}

      {activeTab === 'Display' && (
        <div>
          <div className="form-row">
            <label>Theme</label>
            <select
              value={localSettings.theme}
              onChange={(e) => setLocalSettings({ ...localSettings, theme: e.target.value as 'system' | 'light' | 'dark' })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="form-row">
            <label>Disable Search</label>
            <input
              type="checkbox"
              checked={localSettings.searchDisabled}
              onChange={(e) => setLocalSettings({ ...localSettings, searchDisabled: e.target.checked })}
              style={{ height: 'auto', width: 'auto' }}
            />
          </div>
          <div className="form-row">
            <label>Price Polling (ms)</label>
            <input
              type="number"
              value={localSettings.pricePollingInterval}
              onChange={(e) => setLocalSettings({ ...localSettings, pricePollingInterval: parseInt(e.target.value) || 15000 })}
              min="5000"
              max="300000"
              step="1000"
            />
            <span className="hint">{(localSettings.pricePollingInterval / 1000).toFixed(0)}s</span>
          </div>
        </div>
      )}

      {activeTab === 'Export/Import' && (
        <div>
          <div className="form-row">
            <label>Export Current Portfolio</label>
            <button className="btn-sm" onClick={onExportSingle} disabled={!activePortfolioId}>Export JSON</button>
          </div>
          <div className="form-row">
            <label>Export All Portfolios</label>
            <button className="btn-sm" onClick={onExportAll}>Export All JSON</button>
          </div>
          <div className="form-row">
            <label>Export Trade History (CSV)</label>
            <button className="btn-sm" onClick={onExportCSV} disabled={!activePortfolioId}>Export CSV</button>
          </div>
          <div className="form-row">
            <label>Import Portfolio</label>
            <button className="btn-sm" onClick={onImport}>Import JSON</button>
          </div>
          <div className="text-muted text-sm mt-2">
            JSON exports contain full portfolio state including orders and settings. CSV exports trade history for analysis in spreadsheets.
          </div>
        </div>
      )}

      {activeTab === 'Providers' && (
        <div>
          <div className="text-sm text-muted mb-2">
            Choose which provider handles each data type. Providers are tried in order &mdash; if the first fails, the next is used.
          </div>
          {(Object.keys(USECASE_LABELS) as UseCase[]).map((uc) => (
            <div key={uc} className="form-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <label style={{ marginBottom: 0 }}>{USECASE_LABELS[uc]}</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {ALL_PROVIDERS.map((p) => {
                  const priority = localSettings.providerPriority[uc] || []
                  const idx = priority.indexOf(p)
                  const checked = idx !== -1
                  return (
                    <label key={p} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 8px', border: '1px solid var(--border)',
                      background: checked ? 'var(--accent-bg)' : 'transparent',
                      cursor: 'pointer', fontSize: '0.85rem',
                    }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = [...priority]
                          if (checked) {
                            const filtered = next.filter((x) => x !== p)
                            setLocalSettings({
                              ...localSettings,
                              providerPriority: { ...localSettings.providerPriority, [uc]: filtered },
                            })
                          } else {
                            next.push(p)
                            setLocalSettings({
                              ...localSettings,
                              providerPriority: { ...localSettings.providerPriority, [uc]: next },
                            })
                          }
                        }}
                        style={{ height: 'auto', width: 'auto' }}
                      />
                      {PROVIDER_LABELS[p]}
                    </label>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {(localSettings.providerPriority[uc] || []).map((p, i) => (
                  <span key={p} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '2px 8px', border: '1px solid var(--border)',
                    fontSize: '0.8rem', background: 'var(--bg-secondary)',
                  }}>
                    {i + 1}. {PROVIDER_LABELS[p]}
                    {i > 0 && (
                      <button
                        className="btn-sm"
                        onClick={() => {
                          const arr = [...localSettings.providerPriority[uc]]
                          const idx = arr.indexOf(p)
                          if (idx > 0) {
                            [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
                            setLocalSettings({
                              ...localSettings,
                              providerPriority: { ...localSettings.providerPriority, [uc]: arr },
                            })
                          }
                        }}
                        style={{ padding: '0 4px', fontSize: '0.75rem', minWidth: 'auto' }}
                        title="Move up"
                      >▲</button>
                    )}
                    {i < localSettings.providerPriority[uc].length - 1 && (
                      <button
                        className="btn-sm"
                        onClick={() => {
                          const arr = [...localSettings.providerPriority[uc]]
                          const idx = arr.indexOf(p)
                          if (idx < arr.length - 1) {
                            [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
                            setLocalSettings({
                              ...localSettings,
                              providerPriority: { ...localSettings.providerPriority, [uc]: arr },
                            })
                          }
                        }}
                        style={{ padding: '0 4px', fontSize: '0.75rem', minWidth: 'auto' }}
                        title="Move down"
                      >▼</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <div className="text-muted text-sm mt-2">
            {ALL_PROVIDERS.map((p) => (
              <div key={p}><strong>{PROVIDER_LABELS[p]}:</strong> {PROVIDER_NOTES[p]}</div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'Simulation' && (
        <div>
          <div className="form-row">
            <label>Enable Forking</label>
            <input
              type="checkbox"
              checked={localSettings.enableForking}
              onChange={(e) => setLocalSettings({ ...localSettings, enableForking: e.target.checked })}
              style={{ height: 'auto', width: 'auto' }}
            />
          </div>
          <div className="form-row">
            <label>Enable Undo/Redo</label>
            <input
              type="checkbox"
              checked={localSettings.enableUndoRedo}
              onChange={(e) => setLocalSettings({ ...localSettings, enableUndoRedo: e.target.checked })}
              style={{ height: 'auto', width: 'auto' }}
            />
          </div>
          <div className="form-row">
            <label>Undo Warning</label>
            <input
              type="checkbox"
              checked={localSettings.undoWarningEnabled}
              onChange={(e) => setLocalSettings({ ...localSettings, undoWarningEnabled: e.target.checked })}
              style={{ height: 'auto', width: 'auto' }}
            />
          </div>
          <div className="form-row">
            <label>Fork Warning</label>
            <input
              type="checkbox"
              checked={localSettings.forkWarningEnabled}
              onChange={(e) => setLocalSettings({ ...localSettings, forkWarningEnabled: e.target.checked })}
              style={{ height: 'auto', width: 'auto' }}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}
