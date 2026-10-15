import { useMemo } from 'react'
import {
  getRangeStats,
  type PointRange,
  type TrackMetrics,
  type TrackTotals,
} from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useViewState } from './ViewStoreContext.tsx'

export interface DisplayedStats {
  totals: TrackTotals
  selection: PointRange | null
}

/** Totals for the current selection, or the whole-track totals when there is none. */
export function useDisplayedStats(track: Track, metrics: TrackMetrics): DisplayedStats {
  const selection = useViewState((s) => s.selection)
  const totals = useMemo(
    () => (selection ? getRangeStats(track, metrics, selection) : metrics.totals),
    [track, metrics, selection],
  )
  return { totals, selection }
}
