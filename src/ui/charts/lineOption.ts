import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { AXIS_LABEL, FONT_SIZE, GRID, SPLIT_LINE } from './chartTheme.ts'
import type { ChartOption, TooltipParams } from './echarts.ts'
import { buildLineData, buildXAxis, formatX, type XAxisMode } from './xAxis.ts'

export interface LineChartSpec {
  /** One y value per point, in display units. */
  ys: (number | null)[]
  color: string
  /** Translucent fill under the line, if any. */
  areaColor?: string
  /** Value-axis range settings. */
  yRange: { min?: number; max?: number; interval?: number; scale?: boolean; inverse?: boolean }
  /** y-axis tick label. */
  formatYLabel: (y: number) => string
  /** y value (display units) as tooltip text. */
  formatY: (y: number) => string
}

/** Tooltip text for the hovered data item: "1.23 km · 245 m". */
export function tooltipText(
  params: TooltipParams,
  mode: XAxisMode,
  formatY: (y: number) => string,
) {
  const first = Array.isArray(params) ? params[0] : params
  const [x, y] = (first?.value ?? []) as [number?, (number | null)?]
  if (x === undefined) return ''
  return `${formatX(x, mode)} · ${y === null || y === undefined ? '–' : formatY(y)}`
}

/** Pure: a single-series line chart over the chosen x-axis. Data index follows `buildLineData`. */
export function buildLineOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  spec: LineChartSpec,
): ChartOption {
  const { data } = buildLineData(track, metrics, mode, spec.ys)
  return {
    animation: false,
    grid: GRID,
    textStyle: { fontSize: FONT_SIZE },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => tooltipText(params, mode, spec.formatY),
    },
    xAxis: buildXAxis(metrics, mode),
    yAxis: {
      type: 'value',
      ...spec.yRange,
      splitLine: SPLIT_LINE,
      axisLabel: { ...AXIS_LABEL, formatter: spec.formatYLabel },
    },
    series: [
      {
        type: 'line',
        data,
        sampling: 'lttb',
        showSymbol: false,
        connectNulls: false,
        color: spec.color,
        lineStyle: { width: 1.5 },
        ...(spec.areaColor && { areaStyle: { color: spec.areaColor } }),
      },
    ],
  }
}
