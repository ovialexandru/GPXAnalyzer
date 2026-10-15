import { createEvent, fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import { charts, resetEChartsMock, type FakeChart } from '../../test/echartsMock.ts'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { ElevationChart, SpeedChart } from './index.ts'
import { GESTURE_SLOP } from './useChartBrush.ts'
import type { XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function bothCharts(track: Track, metrics: TrackMetrics, mode: XAxisMode = 'distance') {
  return (
    <>
      <ElevationChart track={track} metrics={metrics} mode={mode} />
      <SpeedChart track={track} metrics={metrics} mode={mode} withSlider />
    </>
  )
}

function setup(mode: XAxisMode = 'distance') {
  const track = parseTrack(run)
  const metrics = getTrackMetrics(track)
  const result = renderWithViewStore(bothCharts(track, metrics, mode), {
    pointCount: track.points.length,
  })
  const [elevation, speed] = charts
  return { ...result, track, metrics, elevation, speed }
}

/** The actions of one type the hook dispatched on a chart, with their options. */
function dispatches(chart: FakeChart, type: string) {
  return chart.dispatchAction.mock.calls.filter(([payload]) => payload.type === type)
}

/** The areas of the last brush action dispatched on a chart. */
function lastBrushAreas(chart: FakeChart) {
  return dispatches(chart, 'brush').at(-1)?.[0].areas
}

/** A lineX band over axis values [x0, x1], as ECharts reports it while dragging. */
function brushEvent(x0: number, x1: number) {
  return { type: 'brush', areas: [{ brushType: 'lineX', coordRange: [x0, x1], range: [0, 1] }] }
}

function brush(chart: FakeChart, x0: number, x1: number) {
  chart.emit('brush', brushEvent(x0, x1))
}

function release(chart: FakeChart, x0: number, x1: number) {
  chart.emit('brushend', { ...brushEvent(x0, x1), type: 'brushEnd' })
}

const km = (metrics: TrackMetrics, i: number) => metrics.distance[i] / 1000

/** Points with x inside [x0, x1] km, by brute force. */
function pointsBetween(metrics: TrackMetrics, x0: number, x1: number) {
  const inside = metrics.distance.flatMap((d, i) => (d / 1000 >= x0 && d / 1000 <= x1 ? [i] : []))
  return [inside[0], inside.at(-1)!]
}

/** A touch event on the chart's container: `n` fingers down after it, `changed` of them new or lifted. */
function touch(chart: FakeChart, type: 'touchStart' | 'touchEnd', n: number, changed = 1) {
  const finger = (i: number) => ({ identifier: i, clientX: i, clientY: 0 })
  const touches = Array.from({ length: n }, (_, i) => finger(i))
  const changedTouches = Array.from({ length: changed }, (_, i) => finger(n + i))
  fireEvent[type](chart.node, { touches, changedTouches })
}

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
})

describe('useChartBrush', () => {
  it('activates the lineX brush after each new option', () => {
    const { track, metrics, speed, rerender } = setup()
    const takes = () => dispatches(speed, 'takeGlobalCursor')
    expect(takes()).toEqual([
      [
        {
          type: 'takeGlobalCursor',
          key: 'brush',
          brushOption: { brushType: 'lineX', brushMode: 'single' },
        },
        { silent: true },
      ],
    ])
    rerender(bothCharts(track, metrics, 'time'))
    expect(takes()).toHaveLength(2)
    // After the new option, which drops the brush.
    const takeOrder =
      speed.dispatchAction.mock.invocationCallOrder[
        speed.dispatchAction.mock.calls.indexOf(takes()[1])
      ]
    expect(takeOrder).toBeGreaterThan(speed.setOption.mock.invocationCallOrder.at(-1)!)
  })

  it('brushing one chart sets the store and draws the same range on the other', () => {
    const { store, metrics, elevation, speed } = setup()
    const total = metrics.totals.distance / 1000
    brush(elevation, total * 0.3, total * 0.6)
    const range = pointsBetween(metrics, total * 0.3, total * 0.6)
    expect(store.getState().selection).toEqual(range)

    flushFrame()
    expect(lastBrushAreas(speed)).toEqual([
      {
        brushType: 'lineX',
        xAxisIndex: 0,
        coordRange: [km(metrics, range[0]), km(metrics, range[1])],
      },
    ])
    expect(dispatches(speed, 'brush').at(-1)?.[1]).toEqual({ silent: true })
    // The brushed chart already shows its band.
    expect(dispatches(elevation, 'brush')).toHaveLength(0)
  })

  it('a band drawn right to left selects the same points', () => {
    const { store, metrics, elevation } = setup()
    const total = metrics.totals.distance / 1000
    brush(elevation, total * 0.6, total * 0.3)
    expect(store.getState().selection).toEqual(pointsBetween(metrics, total * 0.3, total * 0.6))
  })

  it('the selection follows the drag live and stays after release', () => {
    const { store, metrics, speed } = setup()
    brush(speed, 0.2, 0.4)
    brush(speed, 0.2, 0.8)
    expect(store.getState().selection).toEqual(pointsBetween(metrics, 0.2, 0.8))
    release(speed, 0.2, 0.9)
    expect(store.getState().selection).toEqual(pointsBetween(metrics, 0.2, 0.9))
    expect(dispatches(speed, 'brush')).toHaveLength(0)
  })

  it('a click (the band removed) clears the selection on both charts', () => {
    const { store, elevation, speed } = setup()
    store.setSelection([20, 60])
    flushFrame()
    elevation.emit('brush', { type: 'brush', areas: [] })
    expect(store.getState().selection).toBeNull()
    flushFrame()
    expect(lastBrushAreas(speed)).toEqual([])
  })

  it('a tiny band over fewer than 2 points clears the selection and is removed on release', () => {
    const { store, metrics, elevation } = setup()
    store.setSelection([20, 60])
    flushFrame()
    const x = (km(metrics, 30) + km(metrics, 31)) / 2
    brush(elevation, x - 0.0001, x + 0.0001)
    expect(store.getState().selection).toBeNull()
    // Still dragging: the band stays.
    expect(lastBrushAreas(elevation)).not.toEqual([])

    release(elevation, x - 0.0001, x + 0.0001)
    expect(lastBrushAreas(elevation)).toEqual([])
  })

  it('a selection set elsewhere is drawn on both charts; a store clear removes both bands', () => {
    const { store, metrics, elevation, speed } = setup()
    store.setSelection([30, 60])
    flushFrame()
    for (const chart of [elevation, speed]) {
      expect(lastBrushAreas(chart)).toEqual([
        expect.objectContaining({ coordRange: [km(metrics, 30), km(metrics, 60)] }),
      ])
    }
    store.setSelection(null)
    flushFrame()
    for (const chart of [elevation, speed]) expect(lastBrushAreas(chart)).toEqual([])
  })

  it('driving the brush does not echo back into the store', () => {
    const { store, elevation, speed } = setup()
    // As if ECharts emitted the events for our own dispatch.
    for (const chart of [elevation, speed]) {
      chart.dispatchAction.mockImplementation((payload: { type: string }) => {
        if (payload.type === 'brush') {
          brush(chart, 0, 0.1)
          release(chart, 0, 0.1)
        }
      })
    }
    store.setSelection([30, 60])
    flushFrame()
    expect(dispatches(speed, 'brush')).toHaveLength(1)
    expect(store.getState().selection).toEqual([30, 60])
  })

  it('the x-axis toggle redraws the selection in time units, after the new option', () => {
    const { store, track, metrics, speed, rerender } = setup()
    store.setSelection([40, 80])
    flushFrame()
    rerender(bothCharts(track, metrics, 'time'))
    expect(store.getState().selection).toEqual([40, 80])
    const last = dispatches(speed, 'brush').at(-1)!
    expect(last[0].areas[0].coordRange).toEqual([metrics.elapsed[40], metrics.elapsed[80]])
    const drawOrder =
      speed.dispatchAction.mock.invocationCallOrder[speed.dispatchAction.mock.calls.indexOf(last)]
    expect(drawOrder).toBeGreaterThan(speed.setOption.mock.invocationCallOrder.at(-1)!)
  })

  it('a brush on the time axis maps back to points', () => {
    const { store, metrics, speed } = setup('time')
    brush(speed, metrics.elapsed[40]!, metrics.elapsed[80]!)
    expect(store.getState().selection).toEqual([40, 80])
  })

  it('the speed/pace switch redraws the selection', () => {
    const { store, metrics, speed } = setup()
    store.setSelection([40, 80])
    flushFrame()
    const before = dispatches(speed, 'brush').length
    const region = screen.getByRole('region', { name: 'Speed chart' })
    fireEvent.click(within(region).getByRole('radio', { name: 'Pace' }))
    expect(dispatches(speed, 'brush')).toHaveLength(before + 1)
    expect(lastBrushAreas(speed)[0].coordRange).toEqual([km(metrics, 40), km(metrics, 80)])
  })

  it('new data replaces the brush handlers instead of adding more', () => {
    const { track, metrics, elevation, rerender } = setup()
    rerender(bothCharts(track, metrics, 'time'))
    expect(elevation.handlers.get('brush')?.size).toBe(1)
    expect(elevation.handlers.get('brushend')?.size).toBe(1)
  })
})

describe('useChartBrush pinch', () => {
  it('a second finger switches the brush off; lifting both puts it back', () => {
    const { elevation } = setup()
    const takes = () => dispatches(elevation, 'takeGlobalCursor').map(([p]) => p.brushOption)
    touch(elevation, 'touchStart', 1)
    expect(takes()).toHaveLength(1)
    touch(elevation, 'touchStart', 2)
    expect(takes().at(-1)).toEqual({ brushType: false })
    touch(elevation, 'touchEnd', 1)
    expect(takes()).toHaveLength(2)
    touch(elevation, 'touchEnd', 0)
    expect(takes().at(-1)).toEqual({ brushType: 'lineX', brushMode: 'single' })
  })

  it('what the first finger brushed is undone, and the selection from before is redrawn', () => {
    const { store, metrics, elevation, speed } = setup()
    store.setSelection([20, 60])
    flushFrame()
    touch(elevation, 'touchStart', 1)
    brush(elevation, 0.9, 1.0)
    expect(store.getState().selection).not.toEqual([20, 60])
    touch(elevation, 'touchStart', 2)
    // Ignored during the pinch.
    brush(elevation, 0.1, 1.2)
    release(elevation, 0.1, 1.2)
    touch(elevation, 'touchEnd', 0)

    expect(store.getState().selection).toEqual([20, 60])
    expect(lastBrushAreas(elevation)).toEqual([
      expect.objectContaining({ coordRange: [km(metrics, 20), km(metrics, 60)] }),
    ])
    flushFrame()
    expect(lastBrushAreas(speed)).toEqual([
      expect.objectContaining({ coordRange: [km(metrics, 20), km(metrics, 60)] }),
    ])
  })

  it('two fingers landing together: the selection made by the previous gesture is kept', () => {
    const { store, elevation } = setup()
    touch(elevation, 'touchStart', 1)
    brush(elevation, 0.2, 0.8)
    release(elevation, 0.2, 0.8)
    touch(elevation, 'touchEnd', 0)
    const selected = store.getState().selection
    expect(selected).not.toBeNull()

    touch(elevation, 'touchStart', 2, 2)
    expect(dispatches(elevation, 'takeGlobalCursor').at(-1)?.[0].brushOption).toEqual({
      brushType: false,
    })
    touch(elevation, 'touchEnd', 0, 2)
    expect(store.getState().selection).toEqual(selected)
  })

  it('a one-finger drag is a normal brush', () => {
    const { store, metrics, elevation } = setup()
    touch(elevation, 'touchStart', 1)
    brush(elevation, 0.2, 0.8)
    release(elevation, 0.2, 0.8)
    touch(elevation, 'touchEnd', 0)
    expect(store.getState().selection).toEqual(pointsBetween(metrics, 0.2, 0.8))
    expect(dispatches(elevation, 'takeGlobalCursor')).toHaveLength(1)
  })
})

describe('useChartBrush scroll', () => {
  /** One finger moved to (x, y) from its start at (0, 0). */
  function move(chart: FakeChart, x: number, y: number) {
    const event = createEvent.touchMove(chart.node, {
      touches: [{ identifier: 0, clientX: x, clientY: y }],
      changedTouches: [{ identifier: 0, clientX: x, clientY: y }],
    })
    fireEvent(chart.node, event)
    return event
  }

  /** A touch event whose `preventDefault` reports, after dispatch, whether it still cancels. */
  function cancels(event: Event) {
    const before = event.defaultPrevented
    event.preventDefault()
    return event.defaultPrevented && !before
  }

  it(`a vertical swipe (≥ ${GESTURE_SLOP} px) switches the brush off and keeps the selection`, () => {
    const { store, metrics, elevation } = setup()
    store.setSelection([20, 60])
    flushFrame()
    touch(elevation, 'touchStart', 1)
    move(elevation, 2, GESTURE_SLOP)
    expect(dispatches(elevation, 'takeGlobalCursor').at(-1)?.[0].brushOption).toEqual({
      brushType: false,
    })
    // What ECharts reports during the scroll is ignored.
    brush(elevation, 0.1, 0.2)
    release(elevation, 0.1, 0.2)
    touch(elevation, 'touchEnd', 0)

    expect(store.getState().selection).toEqual([20, 60])
    expect(dispatches(elevation, 'takeGlobalCursor').at(-1)?.[0].brushOption).toEqual({
      brushType: 'lineX',
      brushMode: 'single',
    })
    expect(lastBrushAreas(elevation)).toEqual([
      expect.objectContaining({ coordRange: [km(metrics, 20), km(metrics, 60)] }),
    ])
  })

  it('a horizontal drag stays a brush', () => {
    const { store, metrics, elevation } = setup()
    touch(elevation, 'touchStart', 1)
    move(elevation, GESTURE_SLOP, 3)
    move(elevation, 40, GESTURE_SLOP * 3)
    brush(elevation, 0.2, 0.8)
    release(elevation, 0.2, 0.8)
    touch(elevation, 'touchEnd', 0)
    expect(store.getState().selection).toEqual(pointsBetween(metrics, 0.2, 0.8))
    expect(dispatches(elevation, 'takeGlobalCursor')).toHaveLength(1)
  })

  it("ECharts can't cancel the touch until it is known to be a brush", () => {
    const { elevation } = setup()
    const start = createEvent.touchStart(elevation.node, {
      touches: [{ identifier: 0, clientX: 0, clientY: 0 }],
      changedTouches: [{ identifier: 0, clientX: 0, clientY: 0 }],
    })
    fireEvent(elevation.node, start)
    expect(cancels(start)).toBe(false)
    expect(cancels(move(elevation, 0, 4))).toBe(false)
    expect(cancels(move(elevation, 0, GESTURE_SLOP))).toBe(false)
    touch(elevation, 'touchEnd', 0)

    touch(elevation, 'touchStart', 1)
    expect(cancels(move(elevation, GESTURE_SLOP, 0))).toBe(true)
    touch(elevation, 'touchEnd', 0)
  })
})
