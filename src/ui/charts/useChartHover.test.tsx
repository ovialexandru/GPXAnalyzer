import { getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import {
  charts,
  FAKE_CHART_HEIGHT,
  PX_PER_X,
  resetEChartsMock,
  type FakeChart,
} from '../../test/echartsMock.ts'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { ElevationChart, SpeedChart } from './index.ts'
import type { XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function bothCharts(track: Track, metrics: TrackMetrics, mode: XAxisMode = 'distance') {
  return (
    <>
      <ElevationChart track={track} metrics={metrics} mode={mode} />
      <SpeedChart track={track} metrics={metrics} mode={mode} />
    </>
  )
}

function setup(text = run, mode: XAxisMode = 'distance') {
  const track = parseTrack(text)
  const metrics = getTrackMetrics(track)
  const result = renderWithViewStore(bothCharts(track, metrics, mode))
  const [elevation, speed] = charts
  return { ...result, track, metrics, elevation, speed }
}

const km = (metrics: TrackMetrics, i: number) => metrics.distance[i] / 1000

function pointerAt(chart: FakeChart, x: number) {
  chart.emit('updateAxisPointer', { axesInfo: [{ axisDim: 'x', axisIndex: 0, value: x }] })
}

/** The pointer the hook last drove on a chart. */
function lastPointer(chart: FakeChart) {
  return chart.dispatchAction.mock.lastCall
}

function linkedPointer(x: number) {
  return [
    {
      type: 'updateAxisPointer',
      x: x * PX_PER_X,
      y: FAKE_CHART_HEIGHT / 2,
      tooltipOption: { showContent: false },
    },
    { silent: true },
  ]
}

const HIDDEN = [{ type: 'updateAxisPointer', currTrigger: 'leave' }, { silent: true }]

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
})

describe('useChartHover', () => {
  it('its own axis pointer sets the hover to the nearest point and the chart as source', () => {
    const { store, metrics, elevation, speed } = setup()
    pointerAt(elevation, km(metrics, 40) + 0.0001)
    expect(store.getState().hover).toEqual({ index: 40, source: 'elevation' })
    pointerAt(speed, km(metrics, 90))
    expect(store.getState().hover).toEqual({ index: 90, source: 'speed' })
  })

  it('on the time axis, the axis value is elapsed seconds', () => {
    const { store, metrics, elevation } = setup(run, 'time')
    pointerAt(elevation, metrics.elapsed[40]!)
    expect(store.getState().hover).toEqual({ index: 40, source: 'elevation' })
  })

  it('a hover from the map shows both pointers at the point, without a tooltip', () => {
    const { store, metrics, elevation, speed } = setup()
    store.setHover({ index: 40, source: 'map' })
    flushFrame()
    expect(lastPointer(elevation)).toEqual(linkedPointer(km(metrics, 40)))
    expect(lastPointer(speed)).toEqual(linkedPointer(km(metrics, 40)))
  })

  it('a hover from the other chart shows the pointer only on this one', () => {
    const { store, metrics, elevation, speed } = setup()
    elevation.dispatchAction.mockClear()
    pointerAt(elevation, km(metrics, 60))
    flushFrame()
    expect(lastPointer(speed)).toEqual(linkedPointer(km(metrics, 60)))
    expect(elevation.dispatchAction).not.toHaveBeenCalled()
    expect(store.getState().hover?.source).toBe('elevation')
  })

  it('a cleared hover hides the linked pointer', () => {
    const { store, speed } = setup()
    store.setHover({ index: 40, source: 'map' })
    flushFrame()
    store.setHover(null)
    flushFrame()
    expect(lastPointer(speed)).toEqual(HIDDEN)
  })

  it('globalout clears only the chart’s own hover', () => {
    const { store, metrics, elevation, speed } = setup()
    pointerAt(elevation, km(metrics, 40))
    speed.emit('globalout')
    expect(store.getState().hover).toEqual({ index: 40, source: 'elevation' })
    elevation.emit('globalout')
    expect(store.getState().hover).toBeNull()

    store.setHover({ index: 10, source: 'map' })
    elevation.emit('globalout')
    expect(store.getState().hover).toEqual({ index: 10, source: 'map' })
  })

  it('a pointer leaving the plot area (no x axis info) clears the chart’s own hover', () => {
    const { store, metrics, elevation } = setup()
    pointerAt(elevation, km(metrics, 40))
    elevation.emit('updateAxisPointer', { axesInfo: [] })
    expect(store.getState().hover).toBeNull()
  })

  it('driving the pointer does not echo back into the store', () => {
    const { store, elevation, speed } = setup()
    // As if ECharts emitted the event for our own dispatch.
    for (const chart of [elevation, speed]) {
      chart.dispatchAction.mockImplementation(() => pointerAt(chart, 0.5))
    }
    store.setHover({ index: 40, source: 'map' })
    flushFrame()
    expect(elevation.dispatchAction).toHaveBeenCalled()
    expect(store.getState().hover).toEqual({ index: 40, source: 'map' })
  })

  it('time axis: a point without time hides the pointer', () => {
    const track = parseTrack(run)
    delete track.points[40].time
    const metrics = getTrackMetrics(track)
    const { store } = renderWithViewStore(bothCharts(track, metrics, 'time'))
    store.setHover({ index: 40, source: 'map' })
    flushFrame()
    expect(lastPointer(charts[0])).toEqual(HIDDEN)
    expect(lastPointer(charts[1])).toEqual(HIDDEN)
  })

  it('switching the x-axis keeps the hover and moves the pointer to the new axis', () => {
    const { store, track, metrics, speed, rerender } = setup()
    store.setHover({ index: 40, source: 'map' })
    flushFrame()
    rerender(bothCharts(track, metrics, 'time'))
    expect(store.getState().hover).toEqual({ index: 40, source: 'map' })
    expect(lastPointer(speed)).toEqual(linkedPointer(metrics.elapsed[40]!))
  })

  it('new data replaces the chart handlers instead of adding more', () => {
    const { track, metrics, elevation, rerender } = setup()
    rerender(bothCharts(track, metrics, 'time'))
    expect(elevation.handlers.get('updateAxisPointer')?.size).toBe(1)
    expect(elevation.handlers.get('globalout')?.size).toBe(1)
  })

  it('unmounting leaves the already disposed chart alone', () => {
    const { unmount, elevation } = setup()
    unmount()
    expect(elevation.isDisposed()).toBe(true)
    expect(elevation.off).not.toHaveBeenCalled()
  })

  it('charts in their empty state take no part', () => {
    const track = parseTrack(noEleTime)
    const metrics = getTrackMetrics(track)
    const { store, rerender } = renderWithViewStore(bothCharts(track, metrics))
    const subscribe = vi.spyOn(store, 'subscribe')
    rerender(bothCharts(track, metrics, 'time'))
    expect(subscribe).not.toHaveBeenCalled()
    store.setHover({ index: 3, source: 'map' })
    flushFrame()
    expect(charts).toHaveLength(0)
  })

  it('a live chart re-subscribes when its data changes', () => {
    const { store, track, metrics, rerender } = setup()
    const subscribe = vi.spyOn(store, 'subscribe')
    rerender(bothCharts(track, metrics, 'time'))
    // Hover and zoom, on each chart.
    expect(subscribe).toHaveBeenCalledTimes(4)
  })
})
