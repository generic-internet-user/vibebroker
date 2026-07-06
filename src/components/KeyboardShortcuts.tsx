import { Modal } from './Modals'

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
          <div key={s.key} style={{ display: 'contents' }}>
            <span className="key"><span className="key-hint">{s.key}</span></span>
            <span>{s.action}</span>
          </div>
        ))}
      </div>
    </Modal>
  )
}
