import { useState, useEffect } from 'react'
import type { Watchlist, Quote } from '../types'
import { useApp } from '../store/AppContext'
import { saveWatchlist, deleteWatchlist } from '../db'
import * as marketData from '../lib/market-data'
import { Modal } from './Modals'

export function WatchlistsPanel() {
  const { state, dispatch } = useApp()
  const [activeWatchlist, setActiveWatchlist] = useState<string | null>(null)
  const [watchlistQuotes, setWatchlistQuotes] = useState<Record<string, Quote>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [addSymbol, setAddSymbol] = useState('')

  const currentWatchlist = state.watchlists.find(w => w.id === activeWatchlist)

  useEffect(() => {
    if (!currentWatchlist || currentWatchlist.symbols.length === 0) return

    const fetchQuotes = async () => {
      const quotes: Record<string, Quote> = {}
      for (const symbol of currentWatchlist.symbols) {
        try {
          quotes[symbol] = await marketData.getQuote(symbol)
        } catch { }
      }
      setWatchlistQuotes(quotes)
    }
    fetchQuotes()
    const interval = setInterval(fetchQuotes, 30000)
    return () => clearInterval(interval)
  }, [currentWatchlist?.symbols.join(',')])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const watchlist: Watchlist = {
      id: `wl_${Date.now()}`,
      name: newName.trim(),
      symbols: [],
      notes: '',
      sortOrder: state.watchlists.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await saveWatchlist(watchlist)
    dispatch({ type: 'ADD_WATCHLIST', watchlist })
    setActiveWatchlist(watchlist.id)
    setNewName('')
    setShowCreate(false)
  }

  const handleAddSymbol = async () => {
    if (!addSymbol.trim() || !currentWatchlist) return
    const symbol = addSymbol.trim().toUpperCase()
    if (currentWatchlist.symbols.includes(symbol)) {
      setAddSymbol('')
      return
    }
    const updated: Watchlist = {
      ...currentWatchlist,
      symbols: [...currentWatchlist.symbols, symbol],
      updatedAt: Date.now(),
    }
    await saveWatchlist(updated)
    dispatch({ type: 'UPDATE_WATCHLIST', watchlist: updated })
    setAddSymbol('')
  }

  const handleRemoveSymbol = async (symbol: string) => {
    if (!currentWatchlist) return
    const updated: Watchlist = {
      ...currentWatchlist,
      symbols: currentWatchlist.symbols.filter(s => s !== symbol),
      updatedAt: Date.now(),
    }
    await saveWatchlist(updated)
    dispatch({ type: 'UPDATE_WATCHLIST', watchlist: updated })
  }

  const handleDelete = async (id: string) => {
    await deleteWatchlist(id)
    dispatch({ type: 'DELETE_WATCHLIST', id })
    if (activeWatchlist === id) setActiveWatchlist(null)
  }

  return (
    <div className="panel" style={{ maxHeight: 400, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <span>Watchlists</span>
        <button className="btn-sm" onClick={() => setShowCreate(true)}>+</button>
      </div>

      <div className="flex gap-1 p-2" style={{ borderBottom: '1px solid var(--border-light)' }}>
        {state.watchlists.map(w => (
          <button
            key={w.id}
            className={`btn-sm ${activeWatchlist === w.id ? 'btn-primary' : ''}`}
            onClick={() => setActiveWatchlist(w.id)}
          >
            {w.name}
            <span style={{ marginLeft: 4, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleDelete(w.id) }}>&times;</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {currentWatchlist ? (
          <>
            <div className="flex gap-1 mb-1">
              <input
                type="text"
                value={addSymbol}
                onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                placeholder="Add symbol..."
                style={{ flex: 1, height: 24, fontSize: 12 }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
              />
              <button className="btn-sm" onClick={handleAddSymbol}>Add</button>
            </div>
            {currentWatchlist.symbols.map(s => (
              <div key={s} className="flex items-center justify-between" style={{ padding: '4px 0' }}>
                <span className="font-bold mono">{s}</span>
                <span className={`mono text-sm ${(watchlistQuotes[s]?.change || 0) >= 0 ? 'text-positive' : 'text-negative'}`}>
                  ${watchlistQuotes[s]?.price?.toFixed(2) || '...'}
                </span>
                <button className="btn-sm" onClick={() => handleRemoveSymbol(s)}>&times;</button>
              </div>
            ))}
          </>
        ) : (
          <div className="empty-state">Select or create a watchlist</div>
        )}
      </div>

      {showCreate && (
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Watchlist">
          <div className="form-row">
            <label>Name</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleCreate()} />
          </div>
          <div className="modal-footer">
            <button onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleCreate}>Create</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
