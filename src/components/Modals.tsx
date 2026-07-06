import React, { type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  if (!open) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>{title}</span>
          <button onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

interface WarningScreenProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function WarningScreen({ open, title, message, onConfirm, onCancel }: WarningScreenProps) {
  if (!open) return null

  return (
    <div className="warning-screen">
      <h1>{title}</h1>
      <p>{message}</p>
      <div>
        <button onClick={onConfirm}>Continue</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}
