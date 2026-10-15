import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { AXIS_LABEL, FONT_SIZE, GRID, SLIDER_GRID, SPLIT_LINE } from './chartTheme.ts'
import { buildBrush, HIDDEN_TOOLBOX } from './brushOption.ts'
import type { ChartOption, TooltipParams } from './echarts.ts'
import { buildLineData, buildXAxis, formatX, type LineData, type XAxisMode } from './xAxis.ts'
import { buildDataZoom } from './zoomOption.ts'
import type { Units } from '../units/units.ts'

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
  units: Units = 'metric',
) {
  const first = Array.isArray(params) ? params[0] : params
  const [x, y] = (first?.value ?? []) as [number?, (number | null)?]
  if (x === undefined) return ''
  return `${formatX(x, mode, units)} · ${y === null || y === undefined ? '–' : formatY(y)}`
}

export interface LineChart {
  option: ChartOption
  /** The series data and its point mapping, for hover lookups. */
  line: LineData
}

/**
 * Pure: a single-series line chart over the chosen x-axis, zoomable and brushable, with the zoom
 * slider under it when `withSlider`. Data index follows `line`.
 */
export function buildLineOption(
  track: Track,
  metrics: TrackMetrics,
  mode: XAxisMode,
  spec: LineChartSpec,
  withSlider: boolean,
  units: Units = 'metric',
): LineChart {
  const line = buildLineData(track, metrics, mode, spec.ys, units)
  return { option: lineOption(line, metrics, mode, spec, withSlider, units), line }
}

function lineOption(
  { data }: LineData,
  metrics: TrackMetrics,
  mode: XAxisMode,
  spec: LineChartSpec,
  withSlider: boolean,
  units: Units,
): ChartOption {
  return {
    animation: false,
    grid: withSlider ? SLIDER_GRID : GRID,
    textStyle: { fontSize: FONT_SIZE },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => tooltipText(params, mode, spec.formatY, units),
    },
    xAxis: buildXAxis(metrics, mode, units),
    dataZoom: buildDataZoom(mode, withSlider),
    brush: buildBrush(),
    toolbox: HIDDEN_TOOLBOX,
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
