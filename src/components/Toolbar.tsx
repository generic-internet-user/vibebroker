import React from 'react'
import { useApp } from '../store/AppContext'

interface ToolbarProps {
  onNewPortfolio: () => void
  onNewOrder: () => void
  onSearch: () => void
  onSettings: () => void
  onKeyboardShortcuts: () => void
  onUndo?: () => void
  undoDisabled?: boolean
}

export function Toolbar({ onNewPortfolio, onNewOrder, onSearch, onSettings, onKeyboardShortcuts, onUndo, undoDisabled }: ToolbarProps) {
  const { state } = useApp()
  const portfolioCount = state.portfolios.length
  const activeName = state.portfolios.find(p => p.id === state.activePortfolioId)?.name

  return (
    <div className="toolbar">
      <span className="title">VibeBroker</span>

      <div className="toolbar-group">
        <button onClick={onNewPortfolio}>+ Portfolio</button>
        <button onClick={onNewOrder} disabled={!state.activePortfolioId}>New Order</button>
      </div>

      {activeName && (
        <div className="toolbar-group">
          <span className="text-sm text-muted">Portfolio: <strong>{activeName}</strong></span>
        </div>
      )}

      <div className="spacer" />

      <div className="toolbar-group">
        <button onClick={onSearch}>Search <span className="key-hint">/</span></button>
        <button onClick={onKeyboardShortcuts}>Keys</button>
        <button onClick={onSettings}>Settings</button>
        <button onClick={onUndo} disabled={undoDisabled}>Undo</button>
      </div>
    </div>
  )
}
