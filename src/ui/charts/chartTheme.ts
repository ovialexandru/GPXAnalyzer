import type { ChartOption } from './echarts.ts'

/** Chart canvas height in px. */
export const CHART_HEIGHT = 220

export const COLORS = {
  elevation: '#0f766e',
  elevationFill: 'rgba(15, 118, 110, 0.18)',
  speed: '#1d4ed8',
  axisLabel: '#5b6475',
  splitLine: '#e5e9f0',
}

export const FONT_SIZE = 12

/** Padding around the plot area, in px. A fixed left gutter keeps the charts' x-axes aligned. */
export const GRID: ChartOption['grid'] = {
  left: 64,
  right: 24,
  top: 12,
  bottom: 28,
  outerBoundsMode: 'none',
}

/** Labels that would overlap a neighbour (e.g. the axis max next to the last tick) are hidden. */
export const AXIS_LABEL = { color: COLORS.axisLabel, fontSize: FONT_SIZE, hideOverlap: true }
export const SPLIT_LINE = { lineStyle: { color: COLORS.splitLine } }
