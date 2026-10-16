import { useMemo } from 'react'
import { getRangeStats, type TrackTotals } from '../../metrics/index.ts'
import { formatX, rangeToX } from '../charts/xAxis.ts'
import { useViewState, type PointRange } from '../view/index.ts'
import type { Comparison } from './comparison.ts'
import type { TrackId } from './trackIds.ts'

export interface CompareStatsState {
  /** Per track: its totals for the selection (or the whole track); null when no point of it is selected. */
  totals: Record<TrackId, TrackTotals | null>
  /** The selection as axis text, e.g. "2.00 km – 5.00 km"; null without a selection. */
  selectionText: string | null
}

/** Each track's stats over its own part of the shared selection (lined up by distance or time). */
export function useCompareStats(comparison: Comparison): CompareStatsState {
  const selection = useViewState((s) => s.selection)
  const selectionTrack = useViewState((s) => s.selectionTrack)

  return useMemo(() => {
    const [a, b] = comparison.entries
    if (!selection) {
      return { totals: { a: a.metrics.totals, b: b.metrics.totals }, selectionText: null }
    }
    const statsOn = (id: TrackId): TrackTotals | null => {
      const range: PointRange | null = comparison.rangeOn(selection, selectionTrack, id)
      const { track, metrics } = comparison.entry(id)
      return range && getRangeStats(track, metrics, range)
    }
    const { mode, units } = comparison
    const owner = comparison.entry(selectionTrack ?? 'a')
    const x = rangeToX(owner.metrics, mode, selection, units)
    // Empty when the selection has no point on this axis (it is cleared with the axis anyway).
    const selectionText = x ? `${formatX(x[0], mode, units)} – ${formatX(x[1], mode, units)}` : ''
    return { totals: { a: statsOn('a'), b: statsOn('b') }, selectionText }
  }, [comparison, selection, selectionTrack])
}
