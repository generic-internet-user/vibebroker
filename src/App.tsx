import { useState, useCallback, useEffect } from 'react'
import { useApp } from './store/AppContext'
import { savePortfolio, deletePortfolio } from './db'
import { Toolbar } from './components/Toolbar'
import { PortfolioSidebar } from './components/PortfolioSidebar'
import { PortfolioView } from './components/PortfolioView'
import { OrderForm } from './components/OrderForm'
import { SearchDialog } from './components/SearchDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { KeyboardShortcuts } from './components/KeyboardShortcuts'
import { WatchlistsPanel } from './components/WatchlistsPanel'
import { Modal, WarningScreen } from './components/Modals'
import { defaultPortfolioSettings } from './lib/trading'
import { exportPortfolioJSON, exportAllPortfolios, exportTradesCSV, downloadFile, readFileAsText, importAndSavePortfolios } from './lib/export'
import type { Portfolio, OrderAction } from './types'

export default function App() {
  const { state, dispatch, activePortfolio, refreshData } = useApp()

  const [showNewPortfolio, setShowNewPortfolio] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [showNotesEditor, setShowNotesEditor] = useState(false)
  const [notesText, setNotesText] = useState('')
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
        ...defaultPortfolioSettings(),
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

  const handleSaveNotes = async () => {
    if (!activePortfolio) return
    const updated = { ...activePortfolio, notes: notesText, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
    setShowNotesEditor(false)
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
      />

      <div className="content">
        <PortfolioSidebar
          onRename={(id) => setRenameTarget(id)}
          onClone={handleClone}
          onArchive={handleArchive}
          onDelete={handleDelete}
          onFork={(id) => { setForkSourceId(id); setForkWarning(true) }}
        />

        <div className="main">
          {activePortfolio ? (
            <PortfolioView
              portfolio={activePortfolio}
              onBuy={() => { setOrderDefaultAction('buy'); setShowOrderForm(true) }}
              onSell={() => { setOrderDefaultAction('sell'); setShowOrderForm(true) }}
              onEditNotes={() => { setNotesText(activePortfolio.notes); setShowNotesEditor(true) }}
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

      <div className="toolbar" style={{ borderTop: '1px solid var(--border)', borderBottom: 'none' }}>
        <WatchlistsPanel />
        <div className="spacer" />
        <div className="toolbar-group">
          {activePortfolio && (
            <>
              <button className="btn-sm" onClick={handleExportSingle}>Export</button>
              <button className="btn-sm" onClick={handleExportCSV}>CSV</button>
            </>
          )}
          <button className="btn-sm" onClick={handleExportAll}>Export All</button>
          <button className="btn-sm" onClick={handleImport}>Import</button>
        </div>
        <div className="toolbar-group">
          <button className="btn-sm" onClick={handleUndo} disabled={!state.settings.enableUndoRedo}>Undo</button>
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

      <Modal open={showNotesEditor} onClose={() => setShowNotesEditor(false)} title="Portfolio Notes"
        footer={
          <>
            <button onClick={() => setShowNotesEditor(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSaveNotes}>Save</button>
          </>
        }
      >
        <textarea
          value={notesText}
          onChange={(e) => setNotesText(e.target.value)}
          style={{ width: '100%', minHeight: 150 }}
          placeholder="Write your notes here..."
          autoFocus
        />
      </Modal>

      <SearchDialog open={showSearch} onClose={() => setShowSearch(false)} />
      <SettingsDialog open={showSettings} onClose={() => setShowSettings(false)} />
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

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
