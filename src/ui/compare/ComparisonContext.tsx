/* eslint-disable react-refresh/only-export-components -- the provider and its hook belong together */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { XAxisMode } from '../charts/xAxis.ts'
import { useUnits } from '../units/index.ts'
import { axisModeFor, createComparison, type Comparison } from './comparison.ts'
import type { TrackEntry } from './trackIds.ts'

const ComparisonContext = createContext<Comparison | null>(null)

interface ComparisonProviderProps {
  /** The loaded tracks, A first. With fewer than two there is no comparison. */
  entries: readonly TrackEntry[]
  /** The x-axis chosen in the chart toolbar; distance unless both tracks have timestamps. */
  chosenMode: XAxisMode
  children: ReactNode
}

/** Provides the comparison of A and B, or null with a single track (every view then works as before). */
export function ComparisonProvider({ entries, chosenMode, children }: ComparisonProviderProps) {
  const [units] = useUnits()
  const [a, b] = entries
  const mode = useMemo(
    () => (a && b ? axisModeFor([a.track, b.track], chosenMode) : chosenMode),
    [a, b, chosenMode],
  )
  const comparison = useMemo(
    () => (a && b ? createComparison([a, b], mode, units) : null),
    [a, b, mode, units],
  )
  return <ComparisonContext.Provider value={comparison}>{children}</ComparisonContext.Provider>
}

/** The comparison of two tracks, or null when one track is shown. */
export function useComparison(): Comparison | null {
  return useContext(ComparisonContext)
}
