// Shared x-axis handling: distance (km) or elapsed time (s), with segment breaks on the time axis.
import { getSegmentRanges, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatDistance, formatDuration } from '../format.ts'
import type { PointRange } from '../view/index.ts'
import { AXIS_LABEL, SPLIT_LINE } from './chartTheme.ts'
import type { XAXisComponentOption } from './echarts.ts'

export type XAxisMode = 'distance' | 'time'

export interface LineData {
  /** [x, y] pairs in display units; a [x, null] break item is inserted between segments on the time axis. */
  data: [number, number | null][]
  /** Data index -> point index (-1 for break items). Identity on the distance axis. */
  dataToPoint: number[]
}

/** Pure: x values (km or elapsed s) paired with y values, with segment breaks on the time axis. */
export function buildLineData(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  ys: (number | null)[],
): LineData {
  const data: LineData['data'] = []
  const dataToPoint: number[] = []
  if (mode === 'distance') {
    metrics.distance.forEach((d, i) => {
      data.push([d / 1000, ys[i]])
      dataToPoint.push(i)
    })
    return { data, dataToPoint }
  }

  for (const [start, end] of getSegmentRanges(track)) {
    let segmentStarted = false
    for (let i = start; i < end; i++) {
      const x = metrics.elapsed[i]
      if (x === null) continue
      // Break the line across the pause, halfway between the two segments.
      if (!segmentStarted && data.length > 0) {
        data.push([(data[data.length - 1][0] + x) / 2, null])
        dataToPoint.push(-1)
      }
      segmentStarted = true
      data.push([x, ys[i]])
      dataToPoint.push(i)
    }
  }
  return { data, dataToPoint }
}

/** Point index nearest to axis value x (binary search; break items are skipped). Null when there's no data. */
export function pointAtX(line: LineData, x: number): number | null {
  const { data, dataToPoint } = line
  // First data index whose x is >= the target.
  const lo = countBefore(data, x, false)
  let after = lo
  while (after < data.length && dataToPoint[after] === -1) after++
  let before = lo - 1
  while (before >= 0 && dataToPoint[before] === -1) before--
  if (before < 0 && after >= data.length) return null
  if (before < 0) return dataToPoint[after]
  if (after >= data.length) return dataToPoint[before]
  return x - data[before][0] <= data[after][0] - x ? dataToPoint[before] : dataToPoint[after]
}

/** Axis value of a point, or null when the point isn't on this axis (no time on the time axis). */
export function xOfPoint(metrics: TrackMetrics, mode: XAxisMode, index: number): number | null {
  if (mode === 'distance') {
    const d = metrics.distance[index]
    return d === undefined ? null : d / 1000
  }
  return metrics.elapsed[index] ?? null
}

/** Axis values for a point range; edges on untimed points move inward. Null when no point of the range is on the axis. */
export function rangeToX(
  metrics: TrackMetrics,
  mode: XAxisMode,
  [first, last]: PointRange,
): [number, number] | null {
  let x0: number | null = null
  for (let i = first; i <= last && x0 === null; i++) x0 = xOfPoint(metrics, mode, i)
  let x1: number | null = null
  for (let i = last; i >= first && x1 === null; i--) x1 = xOfPoint(metrics, mode, i)
  return x0 === null || x1 === null ? null : [x0, x1]
}

/** Point range covered by axis values [x0, x1]: first point with x >= x0, last with x <= x1. Null when none. */
export function xToRange(line: LineData, x0: number, x1: number): PointRange | null {
  const { data, dataToPoint } = line
  let lo = countBefore(data, x0, false)
  while (lo < data.length && dataToPoint[lo] === -1) lo++
  let hi = countBefore(data, x1, true) - 1
  while (hi >= 0 && dataToPoint[hi] === -1) hi--
  if (lo >= data.length || hi < 0 || dataToPoint[lo] > dataToPoint[hi]) return null
  return [dataToPoint[lo], dataToPoint[hi]]
}

/** Number of leading data items with x below the target (or at it, when `inclusive`); binary search. */
function countBefore(data: LineData['data'], x: number, inclusive: boolean): number {
  let lo = 0
  let hi = data.length
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (data[mid][0] < x || (inclusive && data[mid][0] === x)) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** The axis range: 0 to the track's total distance (km) or duration (s). */
export function axisExtent(metrics: TrackMetrics, mode: XAxisMode): [number, number] {
  return [0, mode === 'distance' ? metrics.totals.distance / 1000 : (metrics.totals.duration ?? 0)]
}

const TIME_INTERVALS = [1, 2, 5, 10, 15, 20, 30, 60, 120, 180, 360].map((min) => min * 60)
const MAX_TIME_TICKS = 6

/** Smallest of 1, 2, 5, 10, 15, 20, 30 min, 1, 2, 3, 6 h giving at most ~6 ticks. */
export function niceTimeInterval(durationSeconds: number): number {
  return TIME_INTERVALS.find((s) => durationSeconds / s <= MAX_TIME_TICKS) ?? TIME_INTERVALS.at(-1)!
}

/** "2.5 km": up to one decimal. */
function kmLabel(km: number): string {
  return `${km.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
}

/** Pure: x-axis option for the mode (km labels, or elapsed-time labels at a nice interval). */
export function buildXAxis(metrics: TrackMetrics, mode: XAxisMode): XAXisComponentOption {
  const [min, max] = axisExtent(metrics, mode)
  const common = { type: 'value', min, max, splitLine: SPLIT_LINE } as const
  if (mode === 'distance') {
    return { ...common, axisLabel: { ...AXIS_LABEL, formatter: kmLabel } }
  }
  return {
    ...common,
    interval: niceTimeInterval(max),
    axisLabel: { ...AXIS_LABEL, formatter: formatDuration },
  }
}

/** The x value of a data item as tooltip text: "1.23 km" or "10:44". */
export function formatX(x: number, mode: XAxisMode): string {
  return mode === 'distance' ? formatDistance(x * 1000) : formatDuration(x)
}
