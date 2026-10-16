// Pure: lines two tracks up on the charts' x-axis, both measured from their own start.
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import {
  buildLineData,
  pointAtX,
  rangeToX,
  xOfPoint,
  xToRange,
  type LineData,
  type XAxisMode,
} from '../charts/xAxis.ts'
import type { Units } from '../units/units.ts'
import type { PointRange } from '../view/index.ts'
import type { TrackId } from './trackIds.ts'

/** A track on the x-axis: its metrics, and its points' axis values (`buildAxisLine`). */
export interface AxisTrack {
  metrics: TrackMetrics
  line: LineData
}

/** The track's points on the axis, without y values (km or mi, or elapsed s; untimed points are left out on time). */
export function buildAxisLine(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  units: Units = 'metric',
): LineData {
  const ys = new Array<null>(track.points.length).fill(null)
  return buildLineData(track, metrics, mode, ys, units)
}

/** The last axis value of the track; null when none of its points is on the axis. */
export function axisEnd({ data }: LineData): number | null {
  return data.at(-1)?.[0] ?? null
}

/**
 * The point of `to` at the same position as point `index` of `from` (nearest; binary search).
 * Null when the position is past the end of `to`, or `to` has no point on the axis.
 */
export function alignedPoint(
  from: AxisTrack,
  index: number,
  to: AxisTrack,
  mode: XAxisMode,
  units: Units = 'metric',
): number | null {
  const x = xOfPoint(from.metrics, mode, index, units)
  const end = axisEnd(to.line)
  if (x === null || end === null || x > end) return null
  return pointAtX(to.line, x)
}

/**
 * The points of `to` over the same positions as `range` of `from`, cut at the end of `to`.
 * Null when that leaves fewer than 2 points.
 */
export function alignedRange(
  from: AxisTrack,
  range: PointRange,
  to: AxisTrack,
  mode: XAxisMode,
  units: Units = 'metric',
): PointRange | null {
  const x = rangeToX(from.metrics, mode, range, units)
  const end = axisEnd(to.line)
  if (!x || end === null || x[0] > end) return null
  const aligned = xToRange(to.line, x[0], Math.min(x[1], end))
  return aligned && aligned[1] > aligned[0] ? aligned : null
}

/** The track that reaches further on the axis (A on a tie): chart ranges and hovers are stored on it. */
export function rangeOwner(a: AxisTrack, b: AxisTrack): TrackId {
  return (axisEnd(b.line) ?? -Infinity) > (axisEnd(a.line) ?? -Infinity) ? 'b' : 'a'
}
