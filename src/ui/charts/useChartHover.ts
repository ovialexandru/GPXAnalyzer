import { useEffect } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Units } from '../units/units.ts'
import {
  useViewStore,
  type Hover,
  type HoverSource,
  type PointRange,
  type TrackId,
} from '../view/index.ts'
import { metricsFor, type ChartTracks } from './chartLink.ts'
import type { ECharts } from './echarts.ts'
import { pointAtX, rangeToX, xOfPoint, type LineData, type XAxisMode } from './xAxis.ts'

interface AxisPointerEvent {
  axesInfo?: { axisDim: string; value: number }[]
}

/**
 * Links a line chart to the shared hover: its own axis pointer sets the hover, and a hover from
 * another view shows the pointer here without a tooltip (hidden when the point is outside the zoom
 * window). Does nothing without a chart and its data. With `tracks` (two compared tracks), `line`
 * and `metrics` are the owner track's: this chart's hover is stored on it, and a hover on either
 * track is shown at its position.
 */
export function useChartHover(
  chart: ECharts | null,
  source: HoverSource,
  line: LineData | null,
  metrics: TrackMetrics,
  mode: XAxisMode,
  units: Units = 'metric',
  tracks?: ChartTracks,
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
      else store.setHover({ index, source, ...(tracks && { track: tracks.owner }) })
    }

    // Axis value of a hover on either track.
    const xAt = (hover: Hover) =>
      xOfPoint(metricsFor(tracks, metrics, hover.track), mode, hover.index, units)

    // Inside the zoom window: by index on the zoomed track, by axis value on the other one.
    const visible = (hover: Hover, zoom: PointRange | null, zoomTrack?: TrackId) => {
      if (!zoom) return true
      if ((hover.track ?? 'a') === (zoomTrack ?? 'a')) {
        return hover.index >= zoom[0] && hover.index <= zoom[1]
      }
      const x = xAt(hover)
      const window = rangeToX(metricsFor(tracks, metrics, zoomTrack), mode, zoom, units)
      return x !== null && window !== null && x >= window[0] && x <= window[1]
    }

    // Under the cursor ECharts draws its own pointer and tooltip; otherwise follow the store.
    const follow = () => {
      const { hover, zoom, zoomTrack } = store.getState()
      if (hover?.source === source) return
      // A point outside the zoom window has no place on this chart.
      const x = hover && visible(hover, zoom, zoomTrack) ? xAt(hover) : null
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
  }, [chart, store, source, line, metrics, mode, units, tracks])
}
