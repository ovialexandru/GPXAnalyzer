import type { Track } from '../model/index.ts'
import { getSegmentRanges } from './segments.ts'

/** Speed below which a point counts as stopped, in m/s. */
export const STOPPED_SPEED = 0.5

/** Seconds since the first point that has a time; null for points without time. */
export function getElapsedTime(track: Track): (number | null)[] {
  const start = track.points.find((p) => p.time !== undefined)?.time
  return track.points.map((p) =>
    p.time === undefined || start === undefined ? null : (p.time - start) / 1000,
  )
}

/**
 * Speed in m/s per point, over a centred time window inside the point's segment.
 * When the window holds only the point itself (sparse recording), its direct timed neighbours are used.
 * Two pointers that only move forward keep this O(n).
 */
export function getSpeedSeries(
  track: Track,
  distance: number[],
  elapsed: (number | null)[],
  windowSeconds = 5,
): (number | null)[] {
  const speed = new Array<number | null>(track.points.length).fill(null)
  const half = windowSeconds / 2

  for (const [start, end] of getSegmentRanges(track)) {
    // Points of this segment that have a time, in order.
    const timed: number[] = []
    for (let i = start; i < end; i++) if (elapsed[i] !== null) timed.push(i)
    if (timed.length < 2) continue

    const t = (k: number) => elapsed[timed[k]] as number
    let lo = 0
    let hi = 0
    for (let k = 0; k < timed.length; k++) {
      while (t(lo) < t(k) - half) lo++
      if (hi < k) hi = k
      while (hi + 1 < timed.length && t(hi + 1) <= t(k) + half) hi++

      let a = lo
      let b = hi
      if (a === b) {
        a = Math.max(0, k - 1)
        b = Math.min(timed.length - 1, k + 1)
      }
      const dt = t(b) - t(a)
      if (dt > 0) speed[timed[k]] = (distance[timed[b]] - distance[timed[a]]) / dt
    }
  }
  return speed
}

/** Pace in s/m per point (1 / speed); null when speed is null or below STOPPED_SPEED. */
export function getPaceSeries(speed: (number | null)[]): (number | null)[] {
  return speed.map((v) => (v === null || v < STOPPED_SPEED ? null : 1 / v))
}
