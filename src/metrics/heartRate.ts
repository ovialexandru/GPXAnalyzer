import type { Track } from '../model/index.ts'
import { getSegmentRanges } from './segments.ts'

/**
 * Time-weighted average heart rate in bpm. Each HR sample counts for the time until the next
 * timed point of its segment. Plain mean of all HR samples when no such interval exists.
 * Null when no point has HR.
 */
export function getAverageHeartRate(track: Track, elapsed: (number | null)[]): number | null {
  const { points } = track
  let weighted = 0
  let weight = 0
  for (const [start, end] of getSegmentRanges(track)) {
    let prev = -1
    for (let i = start; i < end; i++) {
      const t = elapsed[i]
      if (t === null) continue
      const hr = prev >= 0 ? points[prev].hr : undefined
      const dt = prev >= 0 ? t - (elapsed[prev] as number) : 0
      if (hr !== undefined && dt > 0) {
        weighted += hr * dt
        weight += dt
      }
      prev = i
    }
  }
  if (weight > 0) return weighted / weight

  let sum = 0
  let count = 0
  for (const { hr } of points) {
    if (hr === undefined) continue
    sum += hr
    count++
  }
  return count > 0 ? sum / count : null
}
