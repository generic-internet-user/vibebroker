import { useState, useRef, useEffect } from 'react'
import type { Asset } from '../types'
import { useApp } from '../store/AppContext'
import * as marketData from '../lib/market-data'
import { getPortfolio } from '../db'

interface Props {
  open: boolean
  onClose: () => void
}

export function SearchDialog({ open, onClose }: Props) {
  const { state, dispatch } = useApp()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Asset[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
    if (!open) {
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [open, onClose])

  useEffect(() => {
    if (!query || query.length < 1) {
      setResults([])
      // Show local portfolio positions as default results
      if (state.activePortfolioId) {
        getPortfolio(state.activePortfolioId).then(p => {
          if (p) {
            setResults(p.positions.map(pos => pos.asset))
          }
        })
      }
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        // Search local first
        const localSymbols = state.portfolios
          .flatMap(p => p.positions)
          .filter(p => p.symbol.toLowerCase().includes(query.toLowerCase()))
          .map(p => p.asset)

        const localWatchlists = state.watchlists
          .filter(w => w.name.toLowerCase().includes(query.toLowerCase()))
          .map(w => ({
            symbol: w.name,
            name: w.name,
            exchange: '',
            currency: 'USD',
            type: 'stock' as const,
          }))

        let apiResults: Asset[] = []
        if (!state.settings.searchDisabled && !state.settings.searchDisabledCategories.includes('symbols')) {
          try {
            apiResults = await marketData.searchSymbol(query)
          } catch { }
        }

        setResults([...localSymbols, ...localWatchlists, ...apiResults].slice(0, 20))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, state.activePortfolioId, state.portfolios, state.watchlists, state.settings])

  const handleSelect = (asset: Asset) => {
    dispatch({ type: 'SET_ACTIVE_PORTFOLIO', id: state.activePortfolioId })
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 500 }}>
        <div className="modal-header">
          <span>Search</span>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search symbols, companies, watchlists..."
            style={{ width: '100%', marginBottom: 8, height: 32, fontSize: 16 }}
          />
          {searching && <div className="text-muted text-sm mb-1">Searching...</div>}
          {results.map((r, i) => (
            <div
              key={`${r.symbol}-${i}`}
              className="list-item"
              onClick={() => handleSelect(r)}
            >
              <div>
                <span className="font-bold">{r.symbol}</span>
                <span className="text-muted text-sm"> &middot; {r.name}</span>
              </div>
              <span className="text-muted text-sm">{r.exchange}</span>
            </div>
          ))}
          {query && results.length === 0 && !searching && (
            <div className="empty-state">No results found</div>
          )}
        </div>
      </div>
    </div>
  )
}
