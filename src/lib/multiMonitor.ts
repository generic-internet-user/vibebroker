import type { LayoutPanel } from '../types'

const STORAGE_KEY = 'vibebroker_layouts_by_monitor'

const MIN_W = 300
const MIN_H = 200

interface MonitorLayouts {
  [signature: string]: LayoutPanel[]
}

export function getMonitorSignature(): string {
  const s = window.screen
  return [
    s.width,
    s.height,
    s.availLeft,
    s.availTop,
    s.colorDepth,
  ].join('x')
}

export function getMonitorLabel(signature: string = getMonitorSignature()): string {
  const [w, h, left, top] = signature.split('x')
  return `${w}x${h} @ ${left},${top}`
}

function readAll(): MonitorLayouts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(layouts: MonitorLayouts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts))
}

export function loadLayoutForMonitor(signature: string): LayoutPanel[] | null {
  const all = readAll()
  return all[signature] ?? null
}

export function saveLayoutForMonitor(signature: string, panels: LayoutPanel[]) {
  const all = readAll()
  all[signature] = panels
  writeAll(all)
}

export function clearLayoutForMonitor(signature: string) {
  const all = readAll()
  delete all[signature]
  writeAll(all)
}

export function listMonitorLayouts(): { signature: string; label: string; panels: LayoutPanel[] }[] {
  const all = readAll()
  return Object.entries(all).map(([signature, panels]) => ({
    signature,
    label: getMonitorLabel(signature),
    panels,
  }))
}

function visibleBounds(): { width: number; height: number } {
  const width = Math.max(window.innerWidth - 280, MIN_W + 40)
  const height = Math.max(window.innerHeight - 96, MIN_H + 40)
  return { width, height }
}

export function clampPanels(panels: LayoutPanel[]): LayoutPanel[] {
  const { width, height } = visibleBounds()
  return panels.map((p) => {
    const w = Math.max(MIN_W, Math.min(p.width, width))
    const h = Math.max(MIN_H, Math.min(p.height, height))
    const x = Math.max(0, Math.min(p.x, width - w))
    const y = Math.max(0, Math.min(p.y, height - h))
    return { ...p, x, y, width: w, height: h }
  })
}

export function migrateLegacyLayout(): LayoutPanel[] | null {
  try {
    const raw = localStorage.getItem('vibebroker_layout_current')
    if (raw) {
      const panels = JSON.parse(raw) as LayoutPanel[]
      if (Array.isArray(panels) && panels.length > 0) {
        saveLayoutForMonitor(getMonitorSignature(), panels)
        localStorage.removeItem('vibebroker_layout_current')
        return panels
      }
    }
  } catch { }
  return null
}
