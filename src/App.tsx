import { useState, useCallback, useEffect } from 'react'
import { useApp } from './store/AppContext'
import { savePortfolio, deletePortfolio } from './db'
import { Toolbar } from './components/Toolbar'
import { PortfolioSidebar } from './components/PortfolioSidebar'
import { LayoutContainer } from './components/LayoutContainer'
import { OrderForm } from './components/OrderForm'
import { SearchDialog } from './components/SearchDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'

import { Modal, WarningScreen } from './components/Modals'
import { SimulationSettingsForm } from './components/SimulationSettingsForm'
import type { PortfolioSettings } from './types'
import { exportPortfolioJSON, exportAllPortfolios, exportTradesCSV, downloadFile, readFileAsText, importAndSavePortfolios } from './lib/export'
import * as marketData from './lib/market-data'
import type { Portfolio, OrderAction } from './types'

export default function App() {
  const { state, dispatch, activePortfolio, refreshData } = useApp()

  const [showNewPortfolio, setShowNewPortfolio] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderDefaultAction, setOrderDefaultAction] = useState<OrderAction>('buy')
  const [showSearch, setShowSearch] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [newPortfolioCurrency, setNewPortfolioCurrency] = useState('USD')
  const [newPortfolioCash, setNewPortfolioCash] = useState('0')
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameName, setRenameName] = useState('')
  const [undoWarning, setUndoWarning] = useState(false)
  const [forkWarning, setForkWarning] = useState(false)
  const [forkSourceId, setForkSourceId] = useState<string | null>(null)
  const [forkNote, setForkNote] = useState('')
  const [editSettingsId, setEditSettingsId] = useState<string | null>(null)
  const [editSettings, setEditSettings] = useState<PortfolioSettings | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

    switch (e.key) {
      case '/':
        e.preventDefault()
        setShowSearch(true)
        break
      case 'B':
      case 'b':
        if (state.activePortfolioId) {
          setOrderDefaultAction('buy')
          setShowOrderForm(true)
        }
        break
      case 'S':
      case 's':
        if (state.activePortfolioId) {
          setOrderDefaultAction('sell')
          setShowOrderForm(true)
        }
        break
      case 'N':
      case 'n':
        if (state.activePortfolioId) {
          setOrderDefaultAction('buy')
          setShowOrderForm(true)
        }
        break
      case '?':
        setShowShortcuts(true)
        break
      case 'Escape':
        setShowSearch(false)
        setShowOrderForm(false)
        setShowSettings(false)
        setShowShortcuts(false)
        setShowNewPortfolio(false)
        break
    }
  }, [state.activePortfolioId])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    const theme = state.settings.theme
    if (theme === 'dark') {
      document.documentElement.style.setProperty('color-scheme', 'dark')
      document.documentElement.classList.add('dark')
    } else if (theme === 'light') {
      document.documentElement.style.setProperty('color-scheme', 'light')
      document.documentElement.classList.remove('dark')
    } else {
      document.documentElement.style.removeProperty('color-scheme')
      document.documentElement.classList.remove('dark')
    }
  }, [state.settings.theme])

  useEffect(() => {
    const symbols = new Set<string>()

    if (activePortfolio) {
      activePortfolio.positions.forEach(p => symbols.add(p.symbol))
    }

    if (symbols.size === 0) return

    const fetchQuotes = async () => {
      for (const symbol of symbols) {
        try {
          const quote = await marketData.getQuote(symbol)
          dispatch({ type: 'UPDATE_QUOTE', symbol, quote })
        } catch { }
      }
    }

    fetchQuotes()
    const interval = setInterval(fetchQuotes, state.settings.pricePollingInterval)

    return () => clearInterval(interval)
  }, [activePortfolio?.id, state.settings.pricePollingInterval])

  const handleNewPortfolio = async () => {
    if (!newPortfolioName.trim()) return
    const cash = parseFloat(newPortfolioCash) || 0
    const portfolio: Portfolio = {
      id: `pf_${Date.now()}`,
      name: newPortfolioName.trim(),
      baseCurrency: newPortfolioCurrency,
      cashBalance: cash,
      positions: [],
      orders: [],
      tradeHistory: [],
      performanceHistory: [],
      notes: '',
      settings: {
        ...state.settings.defaultSimulationSettings,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
      archived: false,
    }
    await savePortfolio(portfolio)
    dispatch({ type: 'ADD_PORTFOLIO', portfolio })
    dispatch({ type: 'SET_ACTIVE_PORTFOLIO', id: portfolio.id })
    setNewPortfolioName('')
    setNewPortfolioCash('100000')
    setShowNewPortfolio(false)
  }

  const handleRename = async (id: string) => {
    const p = state.portfolios.find(pf => pf.id === id)
    if (!p) return
    if (!renameTarget) {
      setRenameTarget(id)
      setRenameName(p.name)
      return
    }
    const updated = { ...p, name: renameName, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
    setRenameTarget(null)
  }

  const handleClone = async (id: string) => {
    const p = state.portfolios.find(pf => pf.id === id)
    if (!p) return
    const clone: Portfolio = {
      ...p,
      id: `pf_${Date.now()}`,
      name: `${p.name} (clone)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await savePortfolio(clone)
    dispatch({ type: 'ADD_PORTFOLIO', portfolio: clone })
  }

  const handleArchive = async (id: string) => {
    const p = state.portfolios.find(pf => pf.id === id)
    if (!p) return
    const updated = { ...p, archived: !p.archived, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
  }

  const handleDelete = async (id: string) => {
    await deletePortfolio(id)
    dispatch({ type: 'DELETE_PORTFOLIO', id })
  }

  const handleFork = async () => {
    if (!forkSourceId) return
    const source = state.portfolios.find(p => p.id === forkSourceId)
    if (!source) return

    const fork: Portfolio = {
      ...source,
      id: `pf_${Date.now()}`,
      name: `${source.name} (fork)`,
      parentId: source.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: forkNote || `Forked from ${source.name}`,
    }
    await savePortfolio(fork)
    dispatch({ type: 'ADD_PORTFOLIO', portfolio: fork })
    dispatch({ type: 'SET_ACTIVE_PORTFOLIO', id: fork.id })
    setForkSourceId(null)
    setForkNote('')
    setForkWarning(false)
  }

  const handleUndo = () => {
    if (state.settings.undoWarningEnabled) {
      setUndoWarning(true)
    }
  }

  const handleEditSettings = (id: string) => {
    const p = state.portfolios.find(pf => pf.id === id)
    if (!p) return
    setEditSettingsId(id)
    setEditSettings({ ...p.settings })
  }

  const savePortfolioSettings = async () => {
    if (!editSettingsId || !editSettings) return
    const p = state.portfolios.find(pf => pf.id === editSettingsId)
    if (!p) return
    const updated = { ...p, settings: editSettings, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
    setEditSettingsId(null)
    setEditSettings(null)
  }

  const confirmUndo = () => {
    setUndoWarning(false)
    refreshData()
  }

  const handleExportSingle = () => {
    if (!activePortfolio) return
    const json = exportPortfolioJSON(activePortfolio)
    downloadFile(json, `${activePortfolio.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`)
  }

  const handleExportAll = () => {
    const json = exportAllPortfolios(state.portfolios)
    downloadFile(json, `vibebroker_all_portfolios_${new Date().toISOString().split('T')[0]}.json`)
  }

  const handleExportCSV = () => {
    if (!activePortfolio) return
    const csv = exportTradesCSV(activePortfolio.tradeHistory)
    downloadFile(csv, `${activePortfolio.name.replace(/\s+/g, '_')}_trades.csv`, 'text/csv')
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      try {
        const content = await readFileAsText(file)
        const count = await importAndSavePortfolios(content)
        await refreshData()
        alert(`Imported ${count} portfolio(s) successfully.`)
      } catch (err) {
        alert('Import failed: ' + String(err))
      }
    }
    input.click()
  }

  if (state.loading) {
    return <div className="flex items-center justify-center" style={{ height: '100vh' }}>Loading...</div>
  }

  return (
    <div className="layout">
      <Toolbar
        onNewPortfolio={() => setShowNewPortfolio(true)}
        onNewOrder={() => { setOrderDefaultAction('buy'); setShowOrderForm(true) }}
        onSearch={() => setShowSearch(true)}
        onSettings={() => setShowSettings(true)}
        onKeyboardShortcuts={() => setShowShortcuts(true)}
        onUndo={handleUndo}
        undoDisabled={!state.settings.enableUndoRedo}
      />

      <div className="content">
        <PortfolioSidebar
          onRename={(id) => setRenameTarget(id)}
          onClone={handleClone}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onFork={(id) => { setForkSourceId(id); setForkWarning(true) }}
          onEditSettings={handleEditSettings}
        />

        <div className="main" style={{ overflow: 'hidden' }}>
          {activePortfolio ? (
            <LayoutContainer
              portfolio={activePortfolio}
              onBuy={() => { setOrderDefaultAction('buy'); setShowOrderForm(true) }}
              onSell={() => { setOrderDefaultAction('sell'); setShowOrderForm(true) }}
            />
          ) : (
            <div className="empty-state" style={{ marginTop: 48 }}>
              <h2>Welcome to VibeBroker</h2>
              <p>Select a portfolio or create a new one to get started.</p>
              <div className="flex gap-2 items-center justify-center mt-2">
                <button className="btn-primary" onClick={() => setShowNewPortfolio(true)}>Create Portfolio</button>
                <button onClick={handleImport}>Import Portfolio</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showNewPortfolio && (
        <Modal open={showNewPortfolio} onClose={() => setShowNewPortfolio(false)} title="New Portfolio"
          footer={
            <>
              <button onClick={() => setShowNewPortfolio(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleNewPortfolio}>Create</button>
            </>
          }
        >
          <div className="form-row">
            <label>Name</label>
            <input type="text" value={newPortfolioName} onChange={(e) => setNewPortfolioName(e.target.value)} autoFocus placeholder="My Portfolio" />
          </div>
          <div className="form-row">
            <label>Currency</label>
            <select value={newPortfolioCurrency} onChange={(e) => setNewPortfolioCurrency(e.target.value)}>
              {['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK', 'DKK', 'CNY', 'INR', 'BRL', 'MXN', 'SGD', 'HKD', 'KRW', 'ZAR', 'TRY'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Initial Cash</label>
            <input type="number" value={newPortfolioCash} onChange={(e) => setNewPortfolioCash(e.target.value)} step="1000" />
          </div>
        </Modal>
      )}

      {renameTarget && (
        <Modal open={!!renameTarget} onClose={() => setRenameTarget(null)} title="Rename Portfolio"
          footer={
            <>
              <button onClick={() => setRenameTarget(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleRename(renameTarget)}>Rename</button>
            </>
          }
        >
          <div className="form-row">
            <label>New Name</label>
            <input type="text" value={renameName} onChange={(e) => setRenameName(e.target.value)} autoFocus />
          </div>
        </Modal>
      )}

      {activePortfolio && (
        <OrderForm
          open={showOrderForm}
          onClose={() => setShowOrderForm(false)}
          portfolio={activePortfolio}
          defaultAction={orderDefaultAction}
        />
      )}

      <SearchDialog open={showSearch} onClose={() => setShowSearch(false)} />
      <SettingsDialog
        open={showSettings}
        onClose={() => setShowSettings(false)}
        activePortfolioId={state.activePortfolioId}
        onExportSingle={handleExportSingle}
        onExportAll={handleExportAll}
        onExportCSV={handleExportCSV}
        onImport={handleImport}
      />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {editSettingsId && editSettings && (
        <Modal
          open={!!editSettingsId}
          onClose={() => { setEditSettingsId(null); setEditSettings(null) }}
          title="Portfolio Settings"
          footer={
            <>
              <button onClick={() => { setEditSettingsId(null); setEditSettings(null) }}>Cancel</button>
              <button className="btn-primary" onClick={savePortfolioSettings}>Save</button>
            </>
          }
        >
          <SimulationSettingsForm value={editSettings} onChange={setEditSettings} />
        </Modal>
      )}

      <WarningScreen
        open={forkWarning}
        title="Fork Portfolio"
        message="This will create a copy of the current portfolio state as a new independent timeline. You can modify it without affecting the original."
        onConfirm={() => {
          setForkWarning(false)
          handleFork()
        }}
        onCancel={() => { setForkWarning(false); setForkSourceId(null) }}
      />

      <WarningScreen
        open={undoWarning}
        title="Undo Action"
        message="Undoing an action may affect your portfolio state across multiple timelines. Are you sure you want to proceed?"
        onConfirm={confirmUndo}
        onCancel={() => setUndoWarning(false)}
      />
    </div>
  )
}
