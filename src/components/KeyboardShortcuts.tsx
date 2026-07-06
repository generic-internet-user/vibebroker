import React from 'react'
import { Modal } from './Modals'
import type { OrderAction } from '../types'

interface Props {
  open: boolean
  onClose: () => void
}

export function KeyboardShortcuts({ open, onClose }: Props) {
  const shortcuts = [
    { key: 'B', action: 'Buy (default)' },
    { key: 'S', action: 'Sell (default)' },
    { key: '/', action: 'Search' },
    { key: 'N', action: 'New order' },
    { key: '?', action: 'Toggle this reference' },
    { key: 'Escape', action: 'Close dialog / Cancel' },
    { key: 'Enter', action: 'Confirm / Submit' },
  ]

  return (
    <Modal open={open} onClose={onClose} title="Keyboard Shortcuts">
      <div className="shortcuts-grid">
        {shortcuts.map((s) => (
          <React.Fragment key={s.key}>
            <span className="key"><span className="key-hint">{s.key}</span></span>
            <span>{s.action}</span>
          </React.Fragment>
        ))}
      </div>
    </Modal>
  )
}
