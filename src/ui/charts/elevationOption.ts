import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatElevation } from '../format.ts'
import { FEET_PER_METER, type Units } from '../units/units.ts'
import { COLORS } from './chartTheme.ts'
import { buildCompareLineOption, type ChartTrack, type CompareLineChart } from './compareOption.ts'
import { buildLineOption, type LineChart } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

/** Elevation per point in display units (m or ft), and its formatter (which takes display units). */
function elevationValues(units: Units) {
  const perMeter = units === 'imperial' ? FEET_PER_METER : 1
  return {
    ys: (track: Track) => track.points.map((p) => (p.ele === undefined ? null : p.ele * perMeter)),
    // y values are in display units; the formatter takes meters.
    format: (y: number) => formatElevation(y / perMeter, units),
  }
}

/** Pure: elevation (m or ft) vs distance (km or mi) or elapsed time, one data item per point. */
export function buildElevationOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  withSlider = false,
  units: Units = 'metric',
): LineChart {
  const { ys, format } = elevationValues(units)
  return buildLineOption(
    track,
    metrics,
    mode,
    {
      ys: ys(track),
      color: COLORS.elevation,
      areaColor: COLORS.elevationFill,
      yRange: { scale: true },
      formatYLabel: format,
      formatY: format,
    },
    withSlider,
    units,
  )
}

/** Pure: each compared track's elevation, without the fill (two areas would hide each other). */
export function buildElevationCompareOption(
  tracks: readonly ChartTrack[],
  axisMetrics: TrackMetrics,
  mode: XAxisMode,
  withSlider = false,
  units: Units = 'metric',
): CompareLineChart {
  const { ys, format } = elevationValues(units)
  return buildCompareLineOption(
    tracks.map((t) => ({ ...t, ys: ys(t.track) })),
    axisMetrics,
    mode,
    { yRange: { scale: true }, formatYLabel: format, formatY: format },
    withSlider,
    units,
  )
}
