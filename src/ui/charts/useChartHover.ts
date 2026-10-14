import { useEffect } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import { useViewStore, type HoverSource } from '../view/index.ts'
import type { ECharts } from './echarts.ts'
import { pointAtX, xOfPoint, type LineData, type XAxisMode } from './xAxis.ts'

interface AxisPointerEvent {
  axesInfo?: { axisDim: string; value: number }[]
}

/**
 * Links a line chart to the shared hover: its own axis pointer sets the hover, and a hover from
 * another view shows the pointer here without a tooltip. Does nothing without a chart and its data.
 */
export function useChartHover(
  chart: ECharts | null,
  source: HoverSource,
  line: LineData | null,
  metrics: TrackMetrics,
  mode: XAxisMode,
) {
  const store = useViewStore()

  useEffect(() => {
    if (!chart || !line) return
    // Set while this hook drives the chart, so the chart's own events don't echo back to the store.
    let dispatching = false
    const dispatch = (payload: Parameters<ECharts['dispatchAction']>[0]) => {
      dispatching = true
      try {
        chart.dispatchAction(payload, { silent: true })
      } finally {
        dispatching = false
      }
    }

    const clearOwn = () => {
      if (store.getState().hover?.source === source) store.setHover(null)
    }

    const onPointer = (e: unknown) => {
      if (dispatching) return
      const x = (e as AxisPointerEvent).axesInfo?.find((a) => a.axisDim === 'x')?.value
      const index = x === undefined ? null : pointAtX(line, x)
      if (index === null) clearOwn()
      else store.setHover({ index, source })
    }

    // Under the cursor ECharts draws its own pointer and tooltip; otherwise follow the store.
    const follow = () => {
      const { hover } = store.getState()
      if (hover?.source === source) return
      const x = hover && xOfPoint(metrics, mode, hover.index)
      const px = x === null ? undefined : chart.convertToPixel({ xAxisIndex: 0 }, x)
      if (typeof px !== 'number' || !Number.isFinite(px)) {
        dispatch({ type: 'updateAxisPointer', currTrigger: 'leave' })
        return
      }
      dispatch({
        type: 'updateAxisPointer',
        x: px,
        // Any height inside the plot area; the axis trigger only uses x.
        y: chart.getHeight() / 2,
        tooltipOption: { showContent: false },
      })
    }

    chart.on('updateAxisPointer', onPointer)
    chart.on('globalout', clearOwn)
    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      // The chart may already be disposed when its container went away first.
      if (chart.isDisposed()) return
      chart.off('updateAxisPointer', onPointer)
      chart.off('globalout', clearOwn)
    }
  }, [chart, store, source, line, metrics, mode])
}
