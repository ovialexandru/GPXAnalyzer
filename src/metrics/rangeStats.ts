import type { Track } from '../model/index.ts'
import { getElevationChange } from './elevation.ts'
import { getAverageHeartRate } from './heartRate.ts'
import { getMaxSpeedInRange } from './maxSpeed.ts'
import { getMovingStats } from './movement.ts'
import type { PointRange } from './segments.ts'

export interface TrackTotals {
  /** Meters. */
  distance: number
  /** Seconds, last timed point minus first timed point (pauses included). */
  duration: number | null
  /** Meters. */
  elevationGain: number | null
  /** Meters. */
  elevationLoss: number | null
  /** Seconds while moving (speed >= STOPPED_SPEED), segment pauses excluded. */
  movingTime: number | null
  /** m/s: moving distance / moving time. */
  avgSpeed: number | null
  /** m/s: largest smoothed speed, GPS settle spikes ignored. */
  maxSpeed: number | null
  /** bpm, time-weighted. */
  avgHeartRate: number | null
}

/** Derived series, all indexed like `track.points`. */
export interface TrackSeries {
  /** Cumulative meters. */
  distance: number[]
  /** Seconds since the first timed point. */
  elapsed: (number | null)[]
  /** m/s. */
  speed: (number | null)[]
  /** s/m. */
  pace: (number | null)[]
  /** Inside an ignored GPS settle window (whole-track rule), left out of max speed. */
  settleIgnored: boolean[]
}

/** First and last timed points in range, as elapsed seconds; null when none is timed. */
function timedSpan(elapsed: (number | null)[], [first, last]: PointRange): number | null {
  let start: number | null = null
  let end: number | null = null
  for (let i = first; i <= last; i++) {
    const t = elapsed[i]
    if (t === null) continue
    start ??= t
    end = t
  }
  return start === null || end === null ? null : end - start
}

/** Totals for points first..last (inclusive). The whole track is [0, n - 1]. */
export function getRangeStats(track: Track, series: TrackSeries, range: PointRange): TrackTotals {
  const { distance, elapsed, speed, settleIgnored } = series
  const [first, last] = range
  const elevation = getElevationChange(track, undefined, range)
  const moving = getMovingStats(track, distance, elapsed, speed, range)
  return {
    distance: distance[last] - distance[first],
    duration: timedSpan(elapsed, range),
    elevationGain: elevation?.gain ?? null,
    elevationLoss: elevation?.loss ?? null,
    movingTime: moving?.time ?? null,
    avgSpeed: moving && moving.time > 0 ? moving.distance / moving.time : null,
    maxSpeed: getMaxSpeedInRange(speed, settleIgnored, range),
    avgHeartRate: getAverageHeartRate(track, elapsed, range),
  }
}
