import { useState } from 'react'

/** The charts, in page order. */
export const CHART_KINDS = ['speed', 'elevation', 'heartRate', 'cadence'] as const
export type ChartKind = (typeof CHART_KINDS)[number]

const STORAGE_KEY = 'gpx-analyzer.collapsedCharts'

/** The remembered collapsed charts; none when missing, invalid, or storage is unavailable. */
export function loadCollapsed(): Set<ChartKind> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return new Set(CHART_KINDS.filter((k) => Array.isArray(stored) && stored.includes(k)))
  } catch {
    return new Set()
  }
}

/** Remembers the collapsed charts; storage errors are ignored. */
export function saveCollapsed(collapsed: Set<ChartKind>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]))
  } catch {
    // Not remembered: the choice still applies to this visit.
  }
}

/** Which charts are collapsed, and a toggle; remembered across visits and tracks. */
export function useCollapsedCharts(): [Set<ChartKind>, (kind: ChartKind) => void] {
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const toggle = (kind: ChartKind) => {
    const next = new Set(collapsed)
    if (!next.delete(kind)) next.add(kind)
    setCollapsed(next)
    saveCollapsed(next)
  }
  return [collapsed, toggle]
}
