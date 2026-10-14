import { COLORS } from './chartTheme.ts'
import type { ChartOption } from './echarts.ts'

/** The brush as `takeGlobalCursor` activates it: a band across the x axis, one at a time. */
export const BRUSH_CURSOR = { brushType: 'lineX', brushMode: 'single' } as const

/** ECharts adds a toolbox with brush buttons to any option with a brush; the brush is driven by drag instead. */
export const HIDDEN_TOOLBOX: ChartOption['toolbox'] = { show: false }

/**
 * Pure: the brush component, a `lineX` band on x-axis 0. It is drawn by a plain drag once
 * `takeGlobalCursor` activates it (no toolbox buttons; see HIDDEN_TOOLBOX). The band can't be moved or resized, a click
 * removes it, and it leaves the series' look and selection alone (`seriesIndex: []`).
 */
export function buildBrush(): ChartOption['brush'] {
  return {
    ...BRUSH_CURSOR,
    xAxisIndex: 0,
    seriesIndex: [],
    transformable: false,
    removeOnClick: true,
    toolbox: [],
    brushStyle: { color: COLORS.brushFill, borderColor: COLORS.brushBorder, borderWidth: 1 },
  }
}
