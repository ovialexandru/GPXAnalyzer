import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatElevation } from '../format.ts'
import { FEET_PER_METER, type Units } from '../units/units.ts'
import { COLORS } from './chartTheme.ts'
import { buildLineOption, type LineChart } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

/** Pure: elevation (m or ft) vs distance (km or mi) or elapsed time, one data item per point. */
export function buildElevationOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  withSlider = false,
  units: Units = 'metric',
): LineChart {
  const perMeter = units === 'imperial' ? FEET_PER_METER : 1
  // y values are in display units; the formatter takes meters.
  const format = (y: number) => formatElevation(y / perMeter, units)
  return buildLineOption(
    track,
    metrics,
    mode,
    {
      ys: track.points.map((p) => (p.ele === undefined ? null : p.ele * perMeter)),
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
