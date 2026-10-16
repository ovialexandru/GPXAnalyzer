import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track, TrackPoint } from '../../model/index.ts'
import { formatCadence, formatHeartRate } from '../format.ts'
import type { Units } from '../units/units.ts'
import { COLORS } from './chartTheme.ts'
import { buildCompareLineOption, type ChartTrack, type CompareLineChart } from './compareOption.ts'
import { buildLineOption, type LineChart } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

export type SensorKind = 'heartRate' | 'cadence'

const SENSORS: Record<
  SensorKind,
  { read: (p: TrackPoint) => number | undefined; color: string; format: (v: number) => string }
> = {
  heartRate: { read: (p) => p.hr, color: COLORS.heartRate, format: formatHeartRate },
  cadence: { read: (p) => p.cad, color: COLORS.cadence, format: formatCadence },
}

/** Pure: raw heart rate (bpm) or cadence (rpm, as recorded) vs distance or elapsed time. `units` only affects the x-axis. */
export function buildSensorOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  kind: SensorKind,
  withSlider = false,
  units: Units = 'metric',
): LineChart {
  const { read, color, format } = SENSORS[kind]
  return buildLineOption(
    track,
    metrics,
    mode,
    {
      ys: track.points.map((p) => read(p) ?? null),
      color,
      yRange: { scale: true },
      formatYLabel: format,
      formatY: format,
    },
    withSlider,
    units,
  )
}

/** Pure: each compared track's heart rate or cadence. Pass only the tracks that have the data. */
export function buildSensorCompareOption(
  tracks: readonly ChartTrack[],
  axisMetrics: TrackMetrics,
  mode: XAxisMode,
  kind: SensorKind,
  withSlider = false,
  units: Units = 'metric',
): CompareLineChart {
  const { read, format } = SENSORS[kind]
  return buildCompareLineOption(
    tracks.map((t) => ({ ...t, ys: t.track.points.map((p) => read(p) ?? null) })),
    axisMetrics,
    mode,
    { yRange: { scale: true }, formatYLabel: format, formatY: format },
    withSlider,
    units,
  )
}
