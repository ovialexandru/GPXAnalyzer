import { useEffect } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import { useViewStore, type PointRange } from '../view/index.ts'
import { BRUSH_CURSOR } from './brushOption.ts'
import type { ECharts } from './echarts.ts'
import { rangeToX, xToRange, type LineData, type XAxisMode } from './xAxis.ts'

/** The `brush` / `brushEnd` events: the drawn bands, with axis values for a lineX band. */
interface BrushEvent {
  areas?: { coordRange?: number[] }[]
}

/** Point range under a brush event's band; null without one, or when no point is inside. */
function brushedRange(line: LineData, e: unknown): PointRange | null {
  const [x0, x1] = (e as BrushEvent).areas?.[0]?.coordRange ?? []
  if (x0 === undefined || x1 === undefined) return null
  return xToRange(line, Math.min(x0, x1), Math.max(x0, x1))
}

/**
 * Links a line chart's brush to the shared selection: a plain drag draws a band and sets the store's
 * point range live, and a selection set elsewhere (the other chart, Clear) is drawn here. Runs again
 * after every new option (new data, x-axis or speed/pace switch), which drops the brush, so it
 * re-activates it and redraws the selection in the new units.
 *
 * While a brush is active ECharts ignores pinch zoom, so a second finger switches the brush off for
 * the gesture and the selection from before it is put back afterwards.
 */
export function useChartBrush(
  chart: ECharts | null,
  line: LineData | null,
  metrics: TrackMetrics,
  mode: XAxisMode,
) {
  const store = useViewStore()

  useEffect(() => {
    if (!chart || !line) return
    // The store selection this chart shows; a fresh option shows none.
    let shown: PointRange | null = null
    // Set while this hook drives the chart, so its own brush actions don't echo back to the store.
    let dispatching = false
    const dispatch = (payload: Parameters<ECharts['dispatchAction']>[0]) => {
      dispatching = true
      try {
        chart.dispatchAction(payload, { silent: true })
      } finally {
        dispatching = false
      }
    }

    const setCursor = (on: boolean) =>
      dispatch({
        type: 'takeGlobalCursor',
        key: 'brush',
        brushOption: on ? BRUSH_CURSOR : { brushType: false },
      })

    const draw = (selection: PointRange | null) => {
      shown = selection
      const x = selection && rangeToX(metrics, mode, selection)
      dispatch({
        type: 'brush',
        areas: x ? [{ brushType: 'lineX', xAxisIndex: 0, coordRange: x }] : [],
      })
    }

    const follow = () => {
      const { selection } = store.getState()
      if (selection !== shown) draw(selection)
    }

    // Selection before the current touch, and whether that touch became a pinch.
    let beforeTouch: PointRange | null = null
    let pinching = false

    const onBrush = (e: unknown) => {
      if (dispatching || pinching) return
      store.setSelection(brushedRange(line, e))
      // The store may normalise or keep the range; either way this chart already shows the band.
      shown = store.getState().selection
    }

    // Released: a band over fewer than 2 points selects nothing, so it goes too.
    const onBrushEnd = (e: unknown) => {
      if (dispatching || pinching) return
      onBrush(e)
      if (shown === null && (e as BrushEvent).areas?.length) draw(null)
    }

    // Capture phase, before ECharts sees the touch.
    const onTouchStart = (e: TouchEvent) => {
      // A new gesture (every finger down is new): remember the selection in case it becomes a pinch.
      if (e.touches.length === e.changedTouches.length) beforeTouch = store.getState().selection
      if (e.touches.length > 1 && !pinching) {
        pinching = true
        setCursor(false)
      }
    }
    const onTouchEndCapture = (e: TouchEvent) => {
      // Back on before ECharts handles the release, so the brush finishes the drag it started.
      if (pinching && e.touches.length === 0) setCursor(true)
    }
    // Bubble phase, after ECharts handled the release: undo whatever the first finger brushed.
    const onTouchEnd = (e: TouchEvent) => {
      if (!pinching || e.touches.length > 0) return
      pinching = false
      store.setSelection(beforeTouch)
      draw(store.getState().selection)
    }

    const dom = chart.getDom()
    dom.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    for (const type of ['touchend', 'touchcancel'] as const) {
      dom.addEventListener(type, onTouchEndCapture, { capture: true, passive: true })
      dom.addEventListener(type, onTouchEnd, { passive: true })
    }
    chart.on('brush', onBrush)
    chart.on('brushend', onBrushEnd)
    const unsubscribe = store.subscribe(follow)
    setCursor(true)
    follow()
    return () => {
      unsubscribe()
      dom.removeEventListener('touchstart', onTouchStart, { capture: true })
      for (const type of ['touchend', 'touchcancel'] as const) {
        dom.removeEventListener(type, onTouchEndCapture, { capture: true })
        dom.removeEventListener(type, onTouchEnd)
      }
      // The chart may already be disposed when its container went away first.
      if (chart.isDisposed()) return
      chart.off('brush', onBrush)
      chart.off('brushend', onBrushEnd)
    }
  }, [chart, store, line, metrics, mode])
}
