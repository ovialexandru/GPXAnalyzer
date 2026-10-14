import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { formatElevation } from '../format.ts'
import { COLORS } from './chartTheme.ts'
import type { ChartOption } from './echarts.ts'
import { buildLineOption } from './lineOption.ts'
import type { XAxisMode } from './xAxis.ts'

/** Pure: elevation (m) vs distance (km) or elapsed time, one data item per point. */
export function buildElevationOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
): ChartOption {
  return buildLineOption(track, metrics, mode, {
    ys: track.points.map((p) => p.ele ?? null),
    color: COLORS.elevation,
    areaColor: COLORS.elevationFill,
    yRange: { scale: true },
    formatYLabel: formatElevation,
    formatY: formatElevation,
  })
}
