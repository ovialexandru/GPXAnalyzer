import type { Track } from '../model/index.ts'
import { getCumulativeDistance } from './distance.ts'
import { getElevationChange } from './elevation.ts'
import { getElapsedTime, getPaceSeries, getSpeedSeries } from './speed.ts'

export interface TrackTotals {
  /** Meters. */
  distance: number
  /** Seconds, last timed point minus first timed point (pauses included). */
  duration: number | null
  /** Meters. */
  elevationGain: number | null
  /** Meters. */
  elevationLoss: number | null
}

/** All derived series are indexed like `track.points`. */
export interface TrackMetrics {
  /** Cumulative meters. */
  distance: number[]
  /** Seconds since the first timed point. */
  elapsed: (number | null)[]
  /** m/s. */
  speed: (number | null)[]
  /** s/m. */
  pace: (number | null)[]
  totals: TrackTotals
}

function lastNonNull(values: (number | null)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) if (values[i] !== null) return values[i]
  return null
}

export function getTrackMetrics(track: Track): TrackMetrics {
  const distance = getCumulativeDistance(track)
  const elapsed = getElapsedTime(track)
  const speed = getSpeedSeries(track, distance, elapsed)
  const pace = getPaceSeries(speed)
  const elevation = getElevationChange(track)
  return {
    distance,
    elapsed,
    speed,
    pace,
    totals: {
      distance: distance.at(-1) ?? 0,
      duration: lastNonNull(elapsed),
      elevationGain: elevation?.gain ?? null,
      elevationLoss: elevation?.loss ?? null,
    },
  }
}
