// Shared x-axis handling: distance (km) or elapsed time (s), with segment breaks on the time axis.
import { getSegmentRanges, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatDistance, formatDuration } from '../format.ts'
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
  const common = { type: 'value', min: 0, splitLine: SPLIT_LINE } as const
  if (mode === 'distance') {
    return {
      ...common,
      max: metrics.totals.distance / 1000,
      axisLabel: { ...AXIS_LABEL, formatter: kmLabel },
    }
  }
  const duration = metrics.totals.duration ?? 0
  return {
    ...common,
    max: duration,
    interval: niceTimeInterval(duration),
    axisLabel: { ...AXIS_LABEL, formatter: formatDuration },
  }
}

/** The x value of a data item as tooltip text: "1.23 km" or "10:44". */
export function formatX(x: number, mode: XAxisMode): string {
  return mode === 'distance' ? formatDistance(x * 1000) : formatDuration(x)
}
