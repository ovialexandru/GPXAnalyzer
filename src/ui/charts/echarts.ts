// The only place ECharts is imported from: tree-shaken core plus what the charts use.
import { LineChart, type LineSeriesOption } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  type DataZoomComponentOption,
  type GridComponentOption,
  type TooltipComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([LineChart, GridComponent, TooltipComponent, DataZoomComponent, CanvasRenderer])

export { echarts }
export type { ECharts } from 'echarts/core'
// Type-only: no runtime import of the full bundle.
export type {
  TooltipComponentFormatterCallbackParams as TooltipParams,
  XAXisComponentOption,
  YAXisComponentOption,
} from 'echarts'

export type ChartOption = echarts.ComposeOption<
  LineSeriesOption | GridComponentOption | TooltipComponentOption | DataZoomComponentOption
>
