import type { Track, TrackPoint } from '../model/index.ts'
import { clipSegmentRanges, type PointRange } from './segments.ts'

/** Optional per-point sensor fields. */
export type SensorField = 'hr' | 'cad'

export interface SensorStats {
  /**
   * Time-weighted: each included sample counts for the time until the next timed point of its
   * segment inside the range. Plain mean of the included samples when no such interval exists.
   * Null when no sample in range is included.
   */
  average: number | null
  /** Largest sample in range, included or not; null when none. */
  max: number | null
}

const always = () => true

// Named reads: a keyed read (`point[field]`) of a field most points lack is several times slower.
const READ: Record<SensorField, (p: TrackPoint) => number | undefined> = {
  hr: (p) => p.hr,
  cad: (p) => p.cad,
}

/**
 * Average and max of a point field over `range` (default the whole track), in one pass.
 * `include` picks the samples that count towards the average.
 */
export function getSensorStats(
  track: Track,
  elapsed: (number | null)[],
  field: SensorField,
  range?: PointRange,
  include: (value: number) => boolean = always,
): SensorStats {
  const { points } = track
  const read = READ[field]
  let max: number | null = null
  let sum = 0
  let count = 0
  let weighted = 0
  let weight = 0
  for (const [start, end] of clipSegmentRanges(track, range)) {
    // The previous timed point's included sample, and its time.
    let prevValue: number | undefined
    let prevTime: number | null = null
    for (let i = start; i < end; i++) {
      const raw = read(points[i])
      const value = raw !== undefined && include(raw) ? raw : undefined
      if (raw !== undefined && (max === null || raw > max)) max = raw
      if (value !== undefined) {
        sum += value
        count++
      }
      const t = elapsed[i]
      if (t === null) continue
      if (prevValue !== undefined && prevTime !== null && t > prevTime) {
        weighted += prevValue * (t - prevTime)
        weight += t - prevTime
      }
      prevValue = value
      prevTime = t
    }
  }
  const average = weight > 0 ? weighted / weight : count > 0 ? sum / count : null
  return { average, max }
}

/**
 * Cadence (as recorded) while pedalling or stepping: the average leaves zero samples (stopped,
 * coasting) out; the max is the largest sample.
 */
export function getCadenceStats(
  track: Track,
  elapsed: (number | null)[],
  range?: PointRange,
): SensorStats {
  return getSensorStats(track, elapsed, 'cad', range, (v) => v > 0)
}
