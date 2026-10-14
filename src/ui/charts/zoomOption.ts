import { COLORS, PLOT_INSET } from './chartTheme.ts'
import type { ChartOption } from './echarts.ts'
import type { XAxisMode } from './xAxis.ts'

/** Smallest zoom window: 50 m or 30 s. Below that the 5 s speed window and GPS noise dominate. */
export const MIN_SPAN: Record<XAxisMode, number> = { distance: 0.05, time: 30 }

/**
 * Pure: dataZoom components for the x axis. Always the 'inside' zoom (wheel and pinch; plain drag is
 * left free for brushing), plus the slider when `withSlider`. 'filter' lets the y axis fit and LTTB
 * sample only the visible window.
 */
export function buildDataZoom(mode: XAxisMode, withSlider: boolean): ChartOption['dataZoom'] {
  const common = { xAxisIndex: 0, filterMode: 'filter', minValueSpan: MIN_SPAN[mode] } as const
  const inside = {
    ...common,
    type: 'inside',
    zoomOnMouseWheel: true,
    moveOnMouseMove: false,
    moveOnMouseWheel: false,
  } as const
  if (!withSlider) return [inside]
  return [
    inside,
    {
      ...common,
      type: 'slider',
      ...PLOT_INSET,
      bottom: 8,
      height: 22,
      showDetail: false,
      borderColor: COLORS.sliderBorder,
      fillerColor: COLORS.sliderFill,
      handleStyle: { color: '#ffffff', borderColor: COLORS.sliderHandle },
      moveHandleStyle: { color: COLORS.sliderBorder },
    },
  ]
}
