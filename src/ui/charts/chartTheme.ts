import type { ChartOption } from './echarts.ts'

/** Chart canvas height in px. */
export const CHART_HEIGHT = 220

/** Room under the plot area for the zoom slider, in px; the slider chart's canvas grows by this much. */
export const SLIDER_SPACE = 40

export const COLORS = {
  elevation: '#0f766e',
  elevationFill: 'rgba(15, 118, 110, 0.18)',
  speed: '#1d4ed8',
  heartRate: '#dc2626',
  cadence: '#7c3aed',
  axisLabel: '#5b6475',
  splitLine: '#e5e9f0',
  sliderBorder: '#c3cbd8',
  sliderFill: 'rgba(29, 78, 216, 0.12)',
  sliderHandle: '#1d4ed8',
  brushFill: 'rgba(245, 158, 11, 0.2)',
  brushBorder: 'rgba(217, 119, 6, 0.6)',
}

export const FONT_SIZE = 12

/** Left and right padding around the plot area, in px. A fixed left gutter keeps the charts' x-axes aligned. */
export const PLOT_INSET = { left: 64, right: 24 }

const GRID_BOTTOM = 28
const GRID_BASE = { ...PLOT_INSET, top: 12, bottom: GRID_BOTTOM, outerBoundsMode: 'none' } as const

/** Padding around the plot area, in px. */
export const GRID: ChartOption['grid'] = GRID_BASE

/** GRID for the chart carrying the zoom slider: the extra bottom room keeps the plot area the same size. */
export const SLIDER_GRID: ChartOption['grid'] = {
  ...GRID_BASE,
  bottom: GRID_BOTTOM + SLIDER_SPACE,
}

/** Labels that would overlap a neighbour (e.g. the axis max next to the last tick) are hidden. */
export const AXIS_LABEL = { color: COLORS.axisLabel, fontSize: FONT_SIZE, hideOverlap: true }
export const SPLIT_LINE = { lineStyle: { color: COLORS.splitLine } }
