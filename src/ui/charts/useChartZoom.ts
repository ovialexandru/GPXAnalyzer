import { useEffect } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Units } from '../units/units.ts'
import { useViewStore, type PointRange } from '../view/index.ts'
import type { ECharts } from './echarts.ts'
import { axisExtent, pointAtX, rangeToX, xToRange, type LineData, type XAxisMode } from './xAxis.ts'

/** A dataZoom window as ECharts reports it: percent of the axis extent, or axis values. */
interface DataZoomWindow {
  start?: number
  end?: number
  startValue?: number
  endValue?: number
}

/** The `datazoom` event: one window, or a batch of them (from the inside zoom). */
interface DataZoomEvent extends DataZoomWindow {
  batch?: DataZoomWindow[]
}

/** Axis values [x0, x1] of a window over the axis extent [min, max]. */
function windowX(w: DataZoomWindow, [min, max]: [number, number]): [number, number] {
  const at = (percent: number | undefined, fallback: number) =>
    percent === undefined ? fallback : min + ((max - min) * percent) / 100
  return [w.startValue ?? at(w.start, min), w.endValue ?? at(w.end, max)]
}

/**
 * Point range shown by the axis window [x0, x1]; null when it spans the whole axis. A window with no
 * point inside (within a pause) takes the nearest points to its edges.
 */
export function windowRange(
  line: LineData,
  [min, max]: [number, number],
  x0: number,
  x1: number,
): PointRange | null {
  if (x0 <= min && x1 >= max) return null
  const range = xToRange(line, x0, x1)
  if (range) return range
  const a = pointAtX(line, x0)
  const b = pointAtX(line, x1)
  return a === null || b === null ? null : [Math.min(a, b), Math.max(a, b)]
}

/**
 * Links a line chart's dataZoom to the shared zoom: zooming this chart sets the store's point range,
 * and a range set elsewhere (the other chart, Reset) is applied here. Runs again after every new
 * option (new data, x-axis or speed/pace switch) and re-applies the zoom, since `notMerge` resets it.
 */
export function useChartZoom(
  chart: ECharts | null,
  line: LineData | null,
  metrics: TrackMetrics,
  mode: XAxisMode,
  units: Units = 'metric',
) {
  const store = useViewStore()

  useEffect(() => {
    if (!chart || !line) return
    const extent = axisExtent(metrics, mode, units)
    // The store zoom this chart shows; a fresh option shows the whole track.
    let shown: PointRange | null = null
    // Set while this hook drives the chart, so its own dataZoom doesn't echo back to the store.
    let dispatching = false

    const follow = () => {
      const { zoom } = store.getState()
      if (zoom === shown) return
      shown = zoom
      const x = zoom && rangeToX(metrics, mode, zoom, units)
      dispatching = true
      try {
        chart.dispatchAction(
          x
            ? { type: 'dataZoom', startValue: x[0], endValue: x[1] }
            : { type: 'dataZoom', start: 0, end: 100 },
          { silent: true },
        )
      } finally {
        dispatching = false
      }
    }

    const onDataZoom = (e: unknown) => {
      if (dispatching) return
      const event = e as DataZoomEvent
      const [x0, x1] = windowX(event.batch?.[0] ?? event, extent)
      store.setZoom(windowRange(line, extent, x0, x1))
      // The store may normalise or keep the range; either way this chart already shows it.
      shown = store.getState().zoom
    }

    chart.on('datazoom', onDataZoom)
    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      // The chart may already be disposed when its container went away first.
      if (!chart.isDisposed()) chart.off('datazoom', onDataZoom)
    }
  }, [chart, store, line, metrics, mode, units])
}
