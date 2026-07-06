import { useState, useEffect } from 'react'
import { useApp } from '../store/AppContext'
import { Modal } from './Modals'

interface Props {
  open: boolean
  onClose: () => void
}

export function SettingsDialog({ open, onClose }: Props) {
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

  const tabs = ['API Keys', 'General', 'Display', 'Simulation']

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
