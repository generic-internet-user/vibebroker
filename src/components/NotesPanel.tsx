import { useState, useEffect } from 'react'
import type { Portfolio } from '../types'
import { useApp } from '../store/AppContext'
import { savePortfolio } from '../db'

interface Props {
  portfolio: Portfolio
}

export function NotesPanel({ portfolio }: Props) {
  const { dispatch } = useApp()
  const [notesText, setNotesText] = useState(portfolio.notes)

  useEffect(() => {
    setNotesText(portfolio.notes)
  }, [portfolio.id, portfolio.notes])

  const handleSave = async () => {
    const updated = { ...portfolio, notes: notesText, updatedAt: Date.now() }
    await savePortfolio(updated)
    dispatch({ type: 'UPDATE_PORTFOLIO', portfolio: updated })
  }

  return (
    <div className="flex flex-col gap-2" style={{ height: '100%' }}>
      <textarea
        value={notesText}
        onChange={(e) => setNotesText(e.target.value)}
        style={{ width: '100%', flex: 1, minHeight: 200 }}
        placeholder="Write your notes about this portfolio..."
      />
      <div className="flex gap-1">
        <button className="btn-primary" onClick={handleSave}>Save Notes</button>
      </div>
    </div>
  )
}
