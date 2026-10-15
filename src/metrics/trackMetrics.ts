import type { Track } from '../model/index.ts'
import { getCumulativeDistance } from './distance.ts'
import { getSettleIgnored } from './maxSpeed.ts'
import { getRangeStats, type TrackSeries, type TrackTotals } from './rangeStats.ts'
import { getElapsedTime, getPaceSeries, getSpeedSeries } from './speed.ts'

/** All derived series are indexed like `track.points`; `totals` cover the whole track. */
export interface TrackMetrics extends TrackSeries {
  totals: TrackTotals
}

const EMPTY_TOTALS: TrackTotals = {
  distance: 0,
  duration: null,
  elevationGain: null,
  elevationLoss: null,
  movingTime: null,
  avgSpeed: null,
  maxSpeed: null,
  avgHeartRate: null,
}

export function getTrackMetrics(track: Track): TrackMetrics {
  const distance = getCumulativeDistance(track)
  const elapsed = getElapsedTime(track)
  const speed = getSpeedSeries(track, distance, elapsed)
  const pace = getPaceSeries(speed)
  const settleIgnored = getSettleIgnored(track, elapsed, speed)
  const series: TrackSeries = { distance, elapsed, speed, pace, settleIgnored }
  const n = track.points.length
  // The whole track is just the full range: the summary and a selection share one code path.
  const totals = n > 0 ? getRangeStats(track, series, [0, n - 1]) : { ...EMPTY_TOTALS }
  return { ...series, totals }
}
