import type { Track } from '../model/index.ts'
import { getSegmentRanges } from './segments.ts'
import { STOPPED_SPEED } from './speed.ts'

export interface MovingStats {
  /** Seconds, >= 0. */
  time: number
  /** Meters, >= 0. */
  distance: number
}

/**
 * Time and distance while moving. An interval between consecutive timed points of the same
 * segment counts as moving when the later point's speed is >= STOPPED_SPEED.
 * Null when the track has no time.
 */
export function getMovingStats(
  track: Track,
  distance: number[],
  elapsed: (number | null)[],
  speed: (number | null)[],
): MovingStats | null {
  if (!elapsed.some((t) => t !== null)) return null
  const moving: MovingStats = { time: 0, distance: 0 }
  for (const [start, end] of getSegmentRanges(track)) {
    let prev = -1
    for (let i = start; i < end; i++) {
      const t = elapsed[i]
      if (t === null) continue
      const v = speed[i]
      if (prev >= 0 && v !== null && v >= STOPPED_SPEED) {
        moving.time += t - (elapsed[prev] as number)
        moving.distance += distance[i] - distance[prev]
      }
      prev = i
    }
  }
  return moving
}
