import type { Track } from '../model/index.ts'
import { clipSegmentRanges, type PointRange } from './segments.ts'
import { STOPPED_SPEED } from './speed.ts'

export interface MovingStats {
  /** Seconds, >= 0. */
  time: number
  /** Meters, >= 0. */
  distance: number
}

/**
 * Time and distance while moving. An interval between consecutive timed points of the same
 * segment (both inside `range`, default the whole track) counts as moving when the later
 * point's speed is >= STOPPED_SPEED. Null when the range has no time.
 */
export function getMovingStats(
  track: Track,
  distance: number[],
  elapsed: (number | null)[],
  speed: (number | null)[],
  range?: PointRange,
): MovingStats | null {
  const moving: MovingStats = { time: 0, distance: 0 }
  let timed = false
  for (const [start, end] of clipSegmentRanges(track, range)) {
    let prev = -1
    for (let i = start; i < end; i++) {
      const t = elapsed[i]
      if (t === null) continue
      timed = true
      const v = speed[i]
      if (prev >= 0 && v !== null && v >= STOPPED_SPEED) {
        moving.time += t - (elapsed[prev] as number)
        moving.distance += distance[i] - distance[prev]
      }
      prev = i
    }
  }
  return timed ? moving : null
}
