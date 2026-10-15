import type { Track } from '../model/index.ts'
import type { PointRange } from './segments.ts'

export interface ElevationChange {
  /** Meters, >= 0. */
  gain: number
  /** Meters, >= 0. */
  loss: number
}

/**
 * Gain/loss with hysteresis: a change counts only once it reaches `threshold` meters from the
 * last counted elevation. Runs over `range` (default the whole track), anchored at its first
 * point with elevation, across segment boundaries, skipping points without elevation.
 * Null when no point in range has elevation.
 */
export function getElevationChange(
  track: Track,
  threshold = 3,
  range?: PointRange,
): ElevationChange | null {
  const { points } = track
  const [first, last] = range ?? [0, points.length - 1]
  let anchor: number | undefined
  let gain = 0
  let loss = 0
  for (let i = Math.max(0, first); i <= Math.min(last, points.length - 1); i++) {
    const { ele } = points[i]
    if (ele === undefined) continue
    if (anchor === undefined) {
      anchor = ele
    } else if (ele - anchor >= threshold) {
      gain += ele - anchor
      anchor = ele
    } else if (anchor - ele >= threshold) {
      loss += anchor - ele
      anchor = ele
    }
  }
  return anchor === undefined ? null : { gain, loss }
}
