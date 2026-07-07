import { useRef, useCallback, useState, useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import type { PanelType } from '../types'

const PANEL_TYPES: { value: PanelType; label: string }[] = [
  { value: 'balance', label: 'Balance' },
  { value: 'chart', label: 'Chart' },
  { value: 'positions', label: 'Portfolio Status' },
  { value: 'watchlists', label: 'Watchlists' },
  { value: 'notes', label: 'Notes' },
]

const MIN_W = 300
const MIN_H = 200

interface DragState {
  mode: 'idle' | 'drag' | 'resize'
  resizeDir: string
  startMX: number
  startMY: number
  startX: number
  startY: number
  startW: number
  startH: number
}

interface Props {
  id: string
  title: string
  type: PanelType
  x: number
  y: number
  width: number
  height: number
  zIndex: number
  children: ReactNode
  onMove: (id: string, x: number, y: number) => void
  onResize: (id: string, w: number, h: number) => void
  onChangeType: (id: string, type: PanelType) => void
  onClose: (id: string) => void
  onFocus: (id: string) => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function FloatingPanel({
  id, title, type, x, y, width, height, zIndex,
  children, onMove, onResize, onChangeType, onClose, onFocus, containerRef,
}: Props) {
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [dragState, setDragState] = useState<DragState>({
    mode: 'idle', resizeDir: '',
    startMX: 0, startMY: 0, startX: 0, startY: 0, startW: 0, startH: 0,
  })
  const dragRef = useRef(dragState)
  dragRef.current = dragState

  useEffect(() => {
    if (dragState.mode === 'idle') return

    const d = dragRef.current

    const handleMouseMove = (e: MouseEvent) => {
      if (d.mode === 'drag') {
        const dx = e.clientX - d.startMX
        const dy = e.clientY - d.startMY
        const c = containerRef.current
        let nx = d.startX + dx
        let ny = d.startY + dy
        if (c) {
          nx = Math.max(0, Math.min(nx, c.clientWidth - MIN_W))
          ny = Math.max(0, Math.min(ny, c.clientHeight - 32))
        }
        onMove(id, nx, ny)
      } else if (d.mode === 'resize') {
        const dw = e.clientX - d.startMX
        const dh = e.clientY - d.startMY
        const dir = d.resizeDir

        let newW = d.startW
        let newH = d.startH
        let newX = d.startX
        let newY = d.startY

        if (dir === 'se' || dir === 'sw' || dir === 'e' || dir === 'w' || dir === 'ne' || dir === 'nw') {
          newW = (dir === 'sw' || dir === 'w' || dir === 'nw') ? d.startW - dw : d.startW + dw
        }
        if (dir === 'se' || dir === 'ne' || dir === 's' || dir === 'n' || dir === 'nw' || dir === 'sw') {
          newH = (dir === 'ne' || dir === 'n' || dir === 'nw') ? d.startH - dh : d.startH + dh
        }

        newW = Math.max(MIN_W, newW)
        newH = Math.max(MIN_H, newH)

        const c = containerRef.current
        if (c) {
          const rightEdge = d.startX + d.startW
          newW = Math.min(newW, c.clientWidth - (d.startX - (newW - d.startW)))
          newH = Math.min(newH, c.clientHeight - (d.startY - (newH - d.startH)) - 32)
          newW = Math.min(newW, c.clientWidth)
          newH = Math.min(newH, c.clientHeight - 32)
        }

        if (dir === 'sw' || dir === 'w' || dir === 'nw') {
          newX = d.startX - (newW - d.startW)
        }
        if (dir === 'ne' || dir === 'n' || dir === 'nw') {
          newY = d.startY - (newH - d.startH)
        }

        onMove(id, newX, newY)
        onResize(id, newW, newH)
      }
    }

    const handleMouseUp = () => {
      setDragState({ mode: 'idle', resizeDir: '', startMX: 0, startMY: 0, startX: 0, startY: 0, startW: 0, startH: 0 })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState.mode, id, onMove, onResize, containerRef])

  const onHeaderMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    onFocus(id)
    setDragState({ mode: 'drag', resizeDir: '', startMX: e.clientX, startMY: e.clientY, startX: x, startY: y, startW: width, startH: height })
  }

  const onResizeMouseDown = (dir: string) => (e: ReactMouseEvent) => {
    e.preventDefault()
    onFocus(id)
    setDragState({ mode: 'resize', resizeDir: dir, startMX: e.clientX, startMY: e.clientY, startX: x, startY: y, startW: width, startH: height })
  }

  const handleTitleClick = (e: ReactMouseEvent) => {
    e.stopPropagation()
    setShowTypeMenu(v => !v)
  }

  return (
    <div
      className="floating-panel"
      style={{ left: x, top: y, width, height, zIndex }}
      onMouseDown={() => onFocus(id)}
    >
      <div className="floating-panel-header" onMouseDown={onHeaderMouseDown}>
        <div className="floating-panel-title-group">
          <span className="floating-panel-title" onClick={handleTitleClick}>
            {title} ▾
          </span>
          {showTypeMenu && (
            <div className="floating-panel-type-menu" onMouseDown={e => e.stopPropagation()}>
              {PANEL_TYPES.map(pt => (
                <div
                  key={pt.value}
                  className={`floating-panel-type-item${pt.value === type ? ' active' : ''}`}
                  onClick={() => { onChangeType(id, pt.value); setShowTypeMenu(false) }}
                >
                  {pt.label}
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="floating-panel-close" onClick={(e) => { e.stopPropagation(); onClose(id) }}>&times;</button>
      </div>
      <div className="floating-panel-body">
        {children}
      </div>
      <div className="resize-handle se" onMouseDown={onResizeMouseDown('se')} />
      <div className="resize-handle sw" onMouseDown={onResizeMouseDown('sw')} />
      <div className="resize-handle ne" onMouseDown={onResizeMouseDown('ne')} />
      <div className="resize-handle nw" onMouseDown={onResizeMouseDown('nw')} />
      <div className="resize-handle n" onMouseDown={onResizeMouseDown('n')} />
      <div className="resize-handle s" onMouseDown={onResizeMouseDown('s')} />
      <div className="resize-handle e" onMouseDown={onResizeMouseDown('e')} />
      <div className="resize-handle w" onMouseDown={onResizeMouseDown('w')} />
    </div>
  )
}
