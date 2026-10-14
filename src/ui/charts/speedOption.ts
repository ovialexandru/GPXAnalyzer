import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatDuration, formatPace, formatSpeed } from '../format.ts'
import { COLORS } from './chartTheme.ts'
import { buildLineOption, type LineChart, type LineChartSpec } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

export type SpeedMetric = 'speed' | 'pace'

/** Slowest pace shown, in min/km; slower points (walking, almost stopped) are clipped. */
export const PACE_AXIS_CAP = 20

/** Pace tick steps in min/km; each divides PACE_AXIS_CAP so a capped axis ends on a tick. */
const PACE_STEPS = [0.5, 1, 2, 5]
const MAX_PACE_TICKS = 6

/** Round pace axis range (min/km) covering the data up to the cap, with at most ~6 steps. */
export function paceAxisRange(ys: (number | null)[]): {
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
  if (fastest === Infinity) return { min: 0, max: PACE_AXIS_CAP, interval: 5 }
  const top = Math.min(PACE_AXIS_CAP, slowest)
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

const toKmh = (v: number | null) => (v === null ? null : v * 3.6)
const toMinPerKm = (v: number | null) => (v === null ? null : (v * 1000) / 60)

function speedSpec(metrics: TrackMetrics): LineChartSpec {
  return {
    ys: metrics.speed.map(toKmh),
    color: COLORS.speed,
    yRange: { min: 0 },
    formatYLabel: (kmh) => `${kmh} km/h`,
    formatY: (kmh) => formatSpeed(kmh / 3.6),
  }
}

function paceSpec(metrics: TrackMetrics): LineChartSpec {
  const ys = metrics.pace.map(toMinPerKm)
  return {
    ys,
    color: COLORS.speed,
    // Inverted so faster is up, like the speed chart.
    yRange: { inverse: true, ...paceAxisRange(ys) },
    formatYLabel: (min) => formatDuration(min * 60),
    formatY: (min) => formatPace((min * 60) / 1000),
  }
}

/** Pure: speed (km/h) or pace (min/km, inverted, capped) vs distance or elapsed time. */
export function buildSpeedOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  metric: SpeedMetric,
  withSlider = false,
): LineChart {
  return buildLineOption(
    track,
    metrics,
    mode,
    metric === 'speed' ? speedSpec(metrics) : paceSpec(metrics),
    withSlider,
  )
}
