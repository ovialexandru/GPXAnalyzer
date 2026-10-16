import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatDuration, formatPace, formatSpeed } from '../format.ts'
import { METERS_PER_MILE, type Units } from '../units/units.ts'
import { COLORS } from './chartTheme.ts'
import { buildCompareLineOption, type ChartTrack, type CompareLineChart } from './compareOption.ts'
import { buildLineOption, type LineChart, type LineChartSpec } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

export type SpeedMetric = 'speed' | 'pace'

/** Slowest pace shown, in min/km; slower points (walking, almost stopped) are clipped. */
export const PACE_AXIS_CAP = 20
/** The same cap in min/mi (32 min/mi rounded down to a multiple of every pace step). */
export const PACE_AXIS_CAP_MI = 30

/** Pace tick steps in min/km or min/mi; each divides both caps so a capped axis ends on a tick. */
const PACE_STEPS = [0.5, 1, 2, 5]
const MAX_PACE_TICKS = 6

/** Round pace axis range (min per km or mi) covering the data up to the cap, with at most ~6 steps. */
export function paceAxisRange(
  ys: (number | null)[],
  cap = PACE_AXIS_CAP,
): {
  min: number
  max: number
  interval: number
} {
  let fastest = Infinity
  let slowest = -Infinity
  for (const y of ys) {
    if (y === null) continue
    if (y < fastest) fastest = y
    if (y > slowest) slowest = y
  }
  if (fastest === Infinity) return { min: 0, max: cap, interval: 5 }
  const top = Math.min(cap, slowest)
  const bottom = Math.min(fastest, top)
  const range = (step: number) => ({
    min: Math.floor(bottom / step) * step,
    max: Math.max(Math.ceil(top / step), Math.floor(bottom / step) + 1) * step,
    interval: step,
  })
  for (const step of PACE_STEPS) {
    const r = range(step)
    if ((r.max - r.min) / step <= MAX_PACE_TICKS) return r
  }
  return range(PACE_STEPS.at(-1)!)
}

function speedSpec(metrics: TrackMetrics, units: Units): LineChartSpec {
  // m/s per display unit (km/h or mph).
  const unit = units === 'imperial' ? METERS_PER_MILE / 3600 : 1 / 3.6
  const label = units === 'imperial' ? 'mph' : 'km/h'
  return {
    ys: metrics.speed.map((v) => (v === null ? null : v / unit)),
    color: COLORS.speed,
    yRange: { min: 0 },
    formatYLabel: (y) => `${y} ${label}`,
    formatY: (y) => formatSpeed(y * unit, units),
  }
}

function paceSpec(metrics: TrackMetrics, units: Units): LineChartSpec {
  // Meters per pace distance (km or mi).
  const distance = units === 'imperial' ? METERS_PER_MILE : 1000
  const ys = metrics.pace.map((v) => (v === null ? null : (v * distance) / 60))
  const cap = units === 'imperial' ? PACE_AXIS_CAP_MI : PACE_AXIS_CAP
  return {
    ys,
    color: COLORS.speed,
    // Inverted so faster is up, like the speed chart.
    yRange: { inverse: true, ...paceAxisRange(ys, cap) },
    formatYLabel: (min) => formatDuration(min * 60),
    formatY: (min) => formatPace((min * 60) / distance, units),
  }
}

/** Pure: speed (km/h or mph) or pace (min/km or min/mi, inverted, capped) vs distance or time. */
export function buildSpeedOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  metric: SpeedMetric,
  withSlider = false,
  units: Units = 'metric',
): LineChart {
  return buildLineOption(
    track,
    metrics,
    mode,
    metric === 'speed' ? speedSpec(metrics, units) : paceSpec(metrics, units),
    withSlider,
    units,
  )
}

/**
 * Pure: speed or pace of each compared track, as `buildSpeedOption` draws one; the pace axis covers
 * both tracks. `axisMetrics` (the track reaching further) sets the x-axis extent.
 */
export function buildSpeedCompareOption(
  tracks: readonly ChartTrack[],
  axisMetrics: TrackMetrics,
  mode: XAxisMode,
  metric: SpeedMetric,
  withSlider = false,
  units: Units = 'metric',
): CompareLineChart {
  const specOf = (metrics: TrackMetrics) =>
    metric === 'speed' ? speedSpec(metrics, units) : paceSpec(metrics, units)
  const specs = tracks.map((t) => specOf(t.metrics))
  const shared = specs[0] ?? specOf(axisMetrics)
  const cap = units === 'imperial' ? PACE_AXIS_CAP_MI : PACE_AXIS_CAP
  const yRange =
    metric === 'pace'
      ? {
          inverse: true,
          ...paceAxisRange(
            specs.flatMap((s) => s.ys),
            cap,
          ),
        }
      : shared.yRange
  return buildCompareLineOption(
    tracks.map((t, i) => ({ ...t, ys: specs[i].ys })),
    axisMetrics,
    mode,
    { ...shared, yRange },
    withSlider,
    units,
  )
}
