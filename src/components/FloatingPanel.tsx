import { useRef, useCallback, useState, useEffect, type ReactNode, type MouseEvent as ReactMouseEvent } from 'react'
import type { PanelType } from '../types'

const PANEL_TYPES: { value: PanelType; label: string }[] = [
  { value: 'chart', label: 'Chart' },
  { value: 'positions', label: 'Positions' },
  { value: 'orders', label: 'Orders' },
  { value: 'history', label: 'History' },
  { value: 'performance', label: 'Performance' },
  { value: 'watchlists', label: 'Watchlists' },
  { value: 'notes', label: 'Notes' },
]

const MIN_W = 300
const MIN_H = 200

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
  const dragRef = useRef<{
    active: boolean
    resizing: boolean
    dir: string
    mx: number
    my: number
    sx: number
    sy: number
    px: number
    py: number
    pw: number
    ph: number
  }>({
    active: false,
    resizing: false,
    dir: '',
    mx: 0, my: 0, sx: 0, sy: 0,
    px: 0, py: 0, pw: 0, ph: 0,
  })

  const clampPosition = useCallback((nx: number, ny: number) => {
    const c = containerRef.current
    if (!c) return { x: nx, y: ny }
    return {
      x: Math.max(0, Math.min(nx, c.clientWidth - MIN_W)),
      y: Math.max(0, Math.min(ny, c.clientHeight - 32)),
    }
  }, [containerRef])

  const clampSize = useCallback((w: number, h: number, cx: number, cy: number) => {
    const c = containerRef.current
    if (!c) return { w, h }
    return {
      w: Math.max(MIN_W, Math.min(w, c.clientWidth - cx)),
      h: Math.max(MIN_H, Math.min(h, c.clientHeight - cy - 32)),
    }
  }, [containerRef])

  useEffect(() => {
    const d = dragRef.current
    if (!d.active && !d.resizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (d.active) {
        const dx = e.clientX - d.mx
        const dy = e.clientY - d.my
        const clamped = clampPosition(d.px + dx, d.py + dy)
        onMove(id, clamped.x, clamped.y)
      }
      if (d.resizing) {
        let dw = e.clientX - d.mx
        let dh = e.clientY - d.my
        let newW = d.pw + (d.dir === 'sw' || d.dir === 'nw' ? -dw : dw)
        let newH = d.ph + (d.dir === 'ne' || d.dir === 'nw' ? -dh : dh)
        let cx = d.px
        let cy = d.py
        if (d.dir === 'sw' || d.dir === 'nw') {
          const c = containerRef.current
          const maxW = c ? c.clientWidth - d.px : newW
          const clampedW = Math.max(MIN_W, Math.min(newW, maxW))
          const actualDx = d.pw - clampedW
          cx = d.px - actualDx
          newW = clampedW
        }
        if (d.dir === 'ne' || d.dir === 'nw') {
          const c = containerRef.current
          const maxH = c ? c.clientHeight - d.py - 32 : newH
          const clampedH = Math.max(MIN_H, Math.min(newH, maxH))
          const actualDy = d.ph - clampedH
          cy = d.py - actualDy
          newH = clampedH
        }
        const clamped = clampSize(newW, newH, cx, cy)
        if (d.dir === 'sw' || d.dir === 'nw') {
          onMove(id, cx, d.py)
        }
        if (d.dir === 'ne' || d.dir === 'nw') {
          onMove(id, d.px, cy)
        }
        onResize(id, clamped.w, clamped.h)
      }
    }

    const handleMouseUp = () => {
      d.active = false
      d.resizing = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [id, x, y, width, height, onMove, onResize, clampPosition, clampSize, containerRef])

  const onHeaderMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    onFocus(id)
    const d = dragRef.current
    d.active = true
    d.resizing = false
    d.mx = e.clientX
    d.my = e.clientY
    d.px = x
    d.py = y
  }

  const onResizeMouseDown = (dir: string) => (e: ReactMouseEvent) => {
    e.preventDefault()
    onFocus(id)
    const d = dragRef.current
    d.active = false
    d.resizing = true
    d.dir = dir
    d.mx = e.clientX
    d.my = e.clientY
    d.px = x
    d.py = y
    d.pw = width
    d.ph = height
  }

  return (
    <div
      className="floating-panel"
      style={{ left: x, top: y, width, height, zIndex }}
      onMouseDown={() => onFocus(id)}
    >
      <div className="floating-panel-header" onMouseDown={onHeaderMouseDown}>
        <div className="floating-panel-title-group">
          <span
            className="floating-panel-title"
            onClick={(e) => { e.stopPropagation(); setShowTypeMenu(v => !v) }}
            onMouseDown={e => e.stopPropagation()}
          >
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
    </div>
  )
}
