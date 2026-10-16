import { useEffect } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Units } from '../units/units.ts'
import { useViewStore, type PointRange, type TrackId } from '../view/index.ts'
import { BRUSH_CURSOR } from './brushOption.ts'
import { metricsFor, type ChartTracks } from './chartLink.ts'
import type { ECharts } from './echarts.ts'
import { rangeToX, xToRange, type LineData, type XAxisMode } from './xAxis.ts'

/** The `brush` / `brushEnd` events: the drawn bands, with axis values for a lineX band. */
interface BrushEvent {
  areas?: { coordRange?: number[] }[]
}

/** Finger travel in px after which a one-finger gesture counts as a scroll or a brush. */
export const GESTURE_SLOP = 10

/** What the current touch gesture turned out to be. */
type Gesture = 'undecided' | 'brush' | 'scroll' | 'pinch'

const noop = () => {}

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
 * Touch: while a brush is active ECharts ignores pinch zoom, and it cancels every touch, so the page
 * can't scroll. A second finger (pinch), or one finger that starts mostly vertical (scroll), switches
 * the brush off for the gesture, and the selection from before it is put back afterwards. Until the
 * gesture is known, and while it scrolls, ECharts' `preventDefault` calls are disarmed.
 *
 * With `tracks` (two compared tracks), `line` and `metrics` are the owner track's: a selection made
 * here is stored on it, and a selection stored on either track is drawn.
 */
export function useChartBrush(
  chart: ECharts | null,
  line: LineData | null,
  metrics: TrackMetrics,
  mode: XAxisMode,
  units: Units = 'metric',
  tracks?: ChartTracks,
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

    const draw = (selection: PointRange | null, selectionTrack?: TrackId) => {
      shown = selection
      const x =
        selection && rangeToX(metricsFor(tracks, metrics, selectionTrack), mode, selection, units)
      dispatch({
        type: 'brush',
        areas: x ? [{ brushType: 'lineX', xAxisIndex: 0, coordRange: x }] : [],
      })
    }

    const follow = () => {
      const { selection, selectionTrack } = store.getState()
      if (selection !== shown) draw(selection, selectionTrack)
    }

    // Selection (and its track) before the current touch, what the touch became, and where it started.
    let beforeTouch: PointRange | null = null
    let beforeTouchTrack: TrackId | undefined
    let gesture: Gesture = 'brush'
    let start = { x: 0, y: 0 }
    const suspended = () => gesture === 'pinch' || gesture === 'scroll'

    const onBrush = (e: unknown) => {
      if (dispatching || suspended()) return
      store.setSelection(brushedRange(line, e), tracks?.owner)
      // The store may normalise or keep the range; either way this chart already shows the band.
      shown = store.getState().selection
    }

    // Released: a band over fewer than 2 points selects nothing, so it goes too.
    const onBrushEnd = (e: unknown) => {
      if (dispatching || suspended()) return
      onBrush(e)
      if (shown === null && (e as BrushEvent).areas?.length) draw(null)
    }

    const suspend = (as: 'pinch' | 'scroll') => {
      if (!suspended()) setCursor(false)
      gesture = as
    }
    // Lets the browser scroll: ECharts would cancel the touch before the direction is known.
    const disarm = (e: TouchEvent) => {
      if (gesture === 'undecided' || gesture === 'scroll') e.preventDefault = noop
    }

    // Capture phase, before ECharts sees the touch.
    const onTouchStart = (e: TouchEvent) => {
      // A new gesture (every finger down is new): remember the selection in case it is undone.
      if (e.touches.length === e.changedTouches.length) {
        beforeTouch = store.getState().selection
        beforeTouchTrack = store.getState().selectionTrack
        gesture = 'undecided'
        start = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
      if (e.touches.length > 1) suspend('pinch')
      disarm(e)
    }
    const onTouchMove = (e: TouchEvent) => {
      if (gesture === 'undecided' && e.touches.length === 1) {
        const dx = Math.abs(e.touches[0].clientX - start.x)
        const dy = Math.abs(e.touches[0].clientY - start.y)
        if (dy >= GESTURE_SLOP && dy > dx) suspend('scroll')
        else if (dx >= GESTURE_SLOP) gesture = 'brush'
      }
      disarm(e)
    }
    const onTouchEndCapture = (e: TouchEvent) => {
      // Back on before ECharts handles the release, so the brush finishes the drag it started.
      if (suspended() && e.touches.length === 0) setCursor(true)
    }
    // Bubble phase, after ECharts handled the release: undo whatever the first finger brushed.
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length > 0) return
      const undo = suspended()
      gesture = 'brush'
      if (!undo) return
      store.setSelection(beforeTouch, beforeTouchTrack)
      const { selection, selectionTrack } = store.getState()
      draw(selection, selectionTrack)
    }

    const dom = chart.getDom()
    dom.addEventListener('touchstart', onTouchStart, { capture: true, passive: true })
    dom.addEventListener('touchmove', onTouchMove, { capture: true, passive: true })
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
      dom.removeEventListener('touchmove', onTouchMove, { capture: true })
      for (const type of ['touchend', 'touchcancel'] as const) {
        dom.removeEventListener(type, onTouchEndCapture, { capture: true })
        dom.removeEventListener(type, onTouchEnd)
      }
      // The chart may already be disposed when its container went away first.
      if (chart.isDisposed()) return
      chart.off('brush', onBrush)
      chart.off('brushend', onBrushEnd)
    }
  }, [chart, store, line, metrics, mode, units, tracks])
}
