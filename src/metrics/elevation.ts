import type { Track } from '../model/index.ts'

export interface ElevationChange {
  /** Meters, >= 0. */
  gain: number
  /** Meters, >= 0. */
  loss: number
}

/**
 * Gain/loss with hysteresis: a change counts only once it reaches `threshold` meters from the
 * last counted elevation. Runs across segment boundaries and skips points without elevation.
 * Null when no point has elevation.
 */
export function getElevationChange(track: Track, threshold = 3): ElevationChange | null {
  let anchor: number | undefined
  let gain = 0
  let loss = 0
  for (const { ele } of track.points) {
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
