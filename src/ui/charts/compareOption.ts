// Pure: a line chart with one series per compared track, a legend naming them, and both values in the tooltip.
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { TRACK_LETTERS, type TrackId } from '../compare/trackIds.ts'
import type { Units } from '../units/units.ts'
import { buildBrush, HIDDEN_TOOLBOX } from './brushOption.ts'
import {
  AXIS_LABEL,
  COLORS,
  FONT_SIZE,
  LEGEND_GRID,
  LEGEND_SLIDER_GRID,
  SPLIT_LINE,
} from './chartTheme.ts'
import type { ChartOption, TooltipParams } from './echarts.ts'
import type { LineChartSpec } from './lineOption.ts'
import {
  buildLineData,
  buildXAxis,
  formatX,
  pointAtX,
  type LineData,
  type XAxisMode,
} from './xAxis.ts'
import { buildDataZoom } from './zoomOption.ts'

/** One compared track's series: its values per point, in display units. */
export interface SeriesInput {
  id: TrackId
  /** The track's name; the legend shows "A · name". */
  name: string
  color: string
  track: Track
  metrics: TrackMetrics
  ys: (number | null)[]
}

/** A compared track as a chart gets it; the chart computes its values. */
export type ChartTrack = Omit<SeriesInput, 'ys'>

/** The axis and formatting shared by the series. */
export type CompareChartSpec = Pick<LineChartSpec, 'yRange' | 'formatYLabel' | 'formatY'>

export interface CompareLineChart {
  option: ChartOption
  /** Each shown track's series data and point mapping. */
  lines: Partial<Record<TrackId, LineData>>
}

const MISSING = '–'

/** The series' legend name: "A · Morning run". */
export function seriesName(id: TrackId, name: string): string {
  return `${TRACK_LETTERS[id]} · ${name}`
}

/** A track's series as the tooltip reads it: its points on the axis and its value per point. */
export interface TooltipSeries {
  id: TrackId
  line: LineData
  ys: (number | null)[]
}

/**
 * Tooltip text for the axis position: "1.23 km · A 12.3 km/h · B 11.8 km/h". Each track's value is
 * looked up at the position (ECharts' axis tooltip only lists the series nearest the pointer); a
 * track that ends before it, or has no value there, shows "–".
 */
export function compareTooltipText(
  params: TooltipParams,
  series: readonly TooltipSeries[],
  mode: XAxisMode,
  formatY: (y: number) => string,
  units: Units = 'metric',
): string {
  const first = (Array.isArray(params) ? params[0] : params) as { axisValue?: number | string }
  const x = Number(first?.axisValue)
  if (first?.axisValue === undefined || !Number.isFinite(x)) return ''
  const parts = series.map(({ id, line, ys }) => {
    const end = line.data.at(-1)?.[0]
    const index = end === undefined || x > end ? null : pointAtX(line, x)
    const y = index === null ? null : ys[index]
    return `${TRACK_LETTERS[id]} ${y === null || y === undefined ? MISSING : formatY(y)}`
  })
  return [formatX(x, mode, units), ...parts].join(' · ')
}

/**
 * Pure: one line per input in its track's color over the chosen x-axis (from 0 to the end of
 * `axisMetrics`, the track reaching further), with a legend (not clickable), zoomable and
 * brushable, with the zoom slider under it when `withSlider`.
 */
export function buildCompareLineOption(
  inputs: readonly SeriesInput[],
  axisMetrics: TrackMetrics,
  mode: XAxisMode,
  spec: CompareChartSpec,
  withSlider: boolean,
  units: Units = 'metric',
): CompareLineChart {
  const lines: Partial<Record<TrackId, LineData>> = {}
  for (const input of inputs) {
    lines[input.id] = buildLineData(input.track, input.metrics, mode, input.ys, units)
  }
  const tooltipSeries = inputs.map(({ id, ys }) => ({ id, ys, line: lines[id]! }))

  const option: ChartOption = {
    animation: false,
    grid: withSlider ? LEGEND_SLIDER_GRID : LEGEND_GRID,
    textStyle: { fontSize: FONT_SIZE },
    legend: {
      type: 'scroll',
      top: 2,
      left: 'center',
      selectedMode: false,
      itemWidth: 16,
      itemHeight: 8,
      data: inputs.map(({ id, name }) => seriesName(id, name)),
      textStyle: { color: COLORS.axisLabel, fontSize: FONT_SIZE, width: 160, overflow: 'truncate' },
    },
    tooltip: {
      trigger: 'axis',
      formatter: (params) => compareTooltipText(params, tooltipSeries, mode, spec.formatY, units),
    },
    xAxis: buildXAxis(axisMetrics, mode, units),
    dataZoom: buildDataZoom(mode, withSlider),
    brush: buildBrush(),
    toolbox: HIDDEN_TOOLBOX,
    yAxis: {
      type: 'value',
      ...spec.yRange,
      splitLine: SPLIT_LINE,
      axisLabel: { ...AXIS_LABEL, formatter: spec.formatYLabel },
    },
    series: inputs.map(({ id, name, color }, i) => ({
      type: 'line',
      name: seriesName(id, name),
      // The first track on top, as on the map (equal values would otherwise hide A under B).
      z: 2 + inputs.length - 1 - i,
      data: lines[id]?.data ?? [],
      sampling: 'lttb',
      showSymbol: false,
      connectNulls: false,
      color,
      lineStyle: { width: 1.5 },
    })),
  }
  return { option, lines }
}
