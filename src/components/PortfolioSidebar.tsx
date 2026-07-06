import React from 'react'
import { useApp } from '../store/AppContext'

interface Props {
  onRename: (id: string) => void
  onClone: (id: string) => void
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onFork: (id: string) => void
}

export function PortfolioSidebar({ onRename, onClone, onArchive, onDelete, onFork }: Props) {
  const { state, dispatch } = useApp()

  const activePortfolios = state.portfolios.filter(p => !p.archived)
  const archivedPortfolios = state.portfolios.filter(p => p.archived)

  return (
    <div className="sidebar">
      <div className="panel-header">Portfolios</div>

      {activePortfolios.length === 0 && (
        <div className="empty-state">No portfolios yet</div>
      )}

      {activePortfolios.map((p) => (
        <div
          key={p.id}
          className={`list-item ${p.id === state.activePortfolioId ? 'active' : ''}`}
          onClick={() => dispatch({ type: 'SET_ACTIVE_PORTFOLIO', id: p.id })}
        >
          <div>
            <div className="name">{p.name}</div>
            <div className="meta">
              {p.baseCurrency} &middot; ${p.cashBalance.toFixed(2)}
            </div>
          </div>
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button className="btn-sm" onClick={() => onRename(p.id)} title="Rename">R</button>
            <button className="btn-sm" onClick={() => onClone(p.id)} title="Clone">C</button>
            {state.settings.enableForking && (
              <button className="btn-sm" onClick={() => onFork(p.id)} title="Fork">F</button>
            )}
            <button className="btn-sm" onClick={() => onArchive(p.id)} title="Archive">A</button>
            <button className="btn-sm" onClick={() => onDelete(p.id)} title="Delete">X</button>
          </div>
        </div>
      ))}

      {archivedPortfolios.length > 0 && (
        <>
          <div className="panel-header" style={{ marginTop: 8 }}>Archived</div>
          {archivedPortfolios.map((p) => (
            <div
              key={p.id}
              className="list-item text-muted"
            >
              <div className="name">{p.name}</div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
