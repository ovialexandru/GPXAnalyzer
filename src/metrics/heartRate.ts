import type { Track } from '../model/index.ts'
import type { PointRange } from './segments.ts'
import { getSensorStats } from './sensors.ts'

/**
 * Time-weighted average heart rate in bpm over `range` (default the whole track). Each HR sample
 * counts for the time until the next timed point of its segment inside the range. Plain mean of
 * the range's HR samples when no such interval exists. Null when no point in range has HR.
 */
export function getAverageHeartRate(
  track: Track,
  elapsed: (number | null)[],
  range?: PointRange,
): number | null {
  return getSensorStats(track, elapsed, 'hr', range).average
}
