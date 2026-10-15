// Metrics layer: Track -> derived series and stats. Must not import from ui.
export { getCumulativeDistance, haversineDistance } from './distance.ts'
export { getElevationChange } from './elevation.ts'
export type { ElevationChange } from './elevation.ts'
export { getAvailableFields } from './fields.ts'
export type { AvailableFields } from './fields.ts'
export { getSegmentLines, getTrackBounds } from './geometry.ts'
export { getAverageHeartRate } from './heartRate.ts'
export {
  getMaxSpeed,
  getMaxSpeedInRange,
  getSettleIgnored,
  MIN_SPEED_SPREAD,
  SETTLE_GAP_SECONDS,
  SETTLE_REFERENCE_SECONDS,
  SETTLE_SECONDS,
  SPIKE_SIGMAS,
} from './maxSpeed.ts'
export { getMovingStats } from './movement.ts'
export { createNearestPointFinder } from './nearest.ts'
export type { MovingStats } from './movement.ts'
export type { LatLon, TrackBounds } from './geometry.ts'
export { getRangeStats } from './rangeStats.ts'
export type { TrackSeries, TrackTotals } from './rangeStats.ts'
export { clipSegmentRanges, getSegmentRanges } from './segments.ts'
export type { PointRange } from './segments.ts'
export { getElapsedTime, getPaceSeries, getSpeedSeries, STOPPED_SPEED } from './speed.ts'
export { getTrackMetrics } from './trackMetrics.ts'
export type { TrackMetrics } from './trackMetrics.ts'
