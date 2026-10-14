import { fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import { charts, resetEChartsMock, type FakeChart } from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { ElevationChart, SpeedChart } from './index.ts'
import { windowRange } from './useChartZoom.ts'
import { buildLineData, type XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function bothCharts(track: Track, metrics: TrackMetrics, mode: XAxisMode = 'distance') {
  return (
    <>
      <ElevationChart track={track} metrics={metrics} mode={mode} />
      <SpeedChart track={track} metrics={metrics} mode={mode} withSlider />
    </>
  )
}

function setup(text = run, mode: XAxisMode = 'distance') {
  const track = parseTrack(text)
  const metrics = getTrackMetrics(track)
  const result = renderWithViewStore(bothCharts(track, metrics, mode), {
    pointCount: track.points.length,
  })
  const [elevation, speed] = charts
  return { ...result, track, metrics, elevation, speed }
}

/** The dataZoom actions the hook dispatched on a chart, with their options. */
function zoomDispatches(chart: FakeChart) {
  return chart.dispatchAction.mock.calls.filter(([payload]) => payload.type === 'dataZoom')
}

function lastZoomDispatch(chart: FakeChart) {
  return zoomDispatches(chart).at(-1)
}

/** A wheel or pinch zoom as ECharts reports it: a batch of percent windows. */
function wheelZoom(chart: FakeChart, start: number, end: number) {
  chart.emit('datazoom', { type: 'datazoom', batch: [{ dataZoomId: 'inside', start, end }] })
}

const km = (metrics: TrackMetrics, i: number) => metrics.distance[i] / 1000

/** Point range inside [x0, x1] km, by brute force. */
function pointsBetween(metrics: TrackMetrics, x0: number, x1: number) {
  const inside = metrics.distance.flatMap((d, i) => (d / 1000 >= x0 && d / 1000 <= x1 ? [i] : []))
  return [inside[0], inside.at(-1)!]
}

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
})

describe('useChartZoom', () => {
  it('a wheel zoom on one chart sets the store and the other chart follows', () => {
    const { store, metrics, elevation, speed } = setup()
    const total = metrics.totals.distance / 1000
    wheelZoom(elevation, 20, 50)
    const range = pointsBetween(metrics, total * 0.2, total * 0.5)
    expect(store.getState().zoom).toEqual(range)

    flushFrame()
    expect(lastZoomDispatch(speed)).toEqual([
      { type: 'dataZoom', startValue: km(metrics, range[0]), endValue: km(metrics, range[1]) },
      { silent: true },
    ])
    expect(zoomDispatches(elevation)).toHaveLength(0)
  })

  it('a slider move (one window, not a batch) works the same way', () => {
    const { store, metrics, elevation, speed } = setup()
    const total = metrics.totals.distance / 1000
    speed.emit('datazoom', { type: 'datazoom', start: 60, end: 90 })
    expect(store.getState().zoom).toEqual(pointsBetween(metrics, total * 0.6, total * 0.9))
    flushFrame()
    expect(zoomDispatches(elevation)).toHaveLength(1)
    expect(zoomDispatches(speed)).toHaveLength(0)
  })

  it('zooming back out to the whole axis clears the zoom', () => {
    const { store, elevation, speed } = setup()
    wheelZoom(elevation, 20, 50)
    flushFrame()
    wheelZoom(elevation, 0, 100)
    expect(store.getState().zoom).toBeNull()
    flushFrame()
    expect(lastZoomDispatch(speed)).toEqual([
      { type: 'dataZoom', start: 0, end: 100 },
      { silent: true },
    ])
  })

  it('a zoom set elsewhere (Reset) is applied to both charts', () => {
    const { store, metrics, elevation, speed } = setup()
    store.setZoom([30, 60])
    flushFrame()
    for (const chart of [elevation, speed]) {
      expect(lastZoomDispatch(chart)?.[0]).toEqual({
        type: 'dataZoom',
        startValue: km(metrics, 30),
        endValue: km(metrics, 60),
      })
    }
    store.setZoom(null)
    flushFrame()
    for (const chart of [elevation, speed]) {
      expect(lastZoomDispatch(chart)?.[0]).toEqual({ type: 'dataZoom', start: 0, end: 100 })
    }
  })

  it('driving the zoom does not echo back into the store', () => {
    const { store, elevation, speed } = setup()
    // As if ECharts emitted the event for our own dispatch.
    for (const chart of [elevation, speed]) {
      chart.dispatchAction.mockImplementation((payload: { type: string }) => {
        if (payload.type === 'dataZoom') wheelZoom(chart, 0, 10)
      })
    }
    store.setZoom([30, 60])
    flushFrame()
    expect(zoomDispatches(speed)).toHaveLength(1)
    expect(store.getState().zoom).toEqual([30, 60])
  })

  it('the x-axis toggle keeps the point range, in the new units, after the new option', () => {
    const { store, track, metrics, speed, rerender } = setup()
    store.setZoom([40, 80])
    flushFrame()
    rerender(bothCharts(track, metrics, 'time'))
    expect(store.getState().zoom).toEqual([40, 80])
    const last = lastZoomDispatch(speed)!
    expect(last[0]).toEqual({
      type: 'dataZoom',
      startValue: metrics.elapsed[40],
      endValue: metrics.elapsed[80],
    })
    // Applied after the new option, which shows the whole track.
    const dispatchOrder =
      speed.dispatchAction.mock.invocationCallOrder[speed.dispatchAction.mock.calls.indexOf(last)]
    expect(dispatchOrder).toBeGreaterThan(speed.setOption.mock.invocationCallOrder.at(-1)!)
  })

  it('the speed/pace switch keeps the zoom', () => {
    const { store, metrics, speed } = setup()
    store.setZoom([40, 80])
    flushFrame()
    const before = zoomDispatches(speed).length
    const region = screen.getByRole('region', { name: 'Speed chart' })
    fireEvent.click(within(region).getByRole('radio', { name: 'Pace' }))
    expect(zoomDispatches(speed)).toHaveLength(before + 1)
    expect(lastZoomDispatch(speed)?.[0]).toMatchObject({ startValue: km(metrics, 40) })
  })

  it('a hovered point outside the zoom window hides the linked pointer', () => {
    const { store, speed } = setup()
    store.setZoom([40, 80])
    store.setHover({ index: 100, source: 'map' })
    flushFrame()
    expect(speed.dispatchAction.mock.lastCall).toEqual([
      { type: 'updateAxisPointer', currTrigger: 'leave' },
      { silent: true },
    ])
    store.setHover({ index: 60, source: 'map' })
    flushFrame()
    const [payload] = speed.dispatchAction.mock.lastCall!
    expect(payload).toMatchObject({ type: 'updateAxisPointer' })
    expect(payload.currTrigger).toBeUndefined()
  })

  it('new data replaces the datazoom handler instead of adding more', () => {
    const { track, metrics, elevation, rerender } = setup()
    rerender(bothCharts(track, metrics, 'time'))
    expect(elevation.handlers.get('datazoom')?.size).toBe(1)
  })
})

describe('windowRange', () => {
  const track = parseTrack(bike)
  const metrics = getTrackMetrics(track)
  const line = buildLineData(track, metrics, 'time', metrics.elapsed)
  const extent: [number, number] = [0, metrics.totals.duration!]

  it('the whole axis is null', () => {
    expect(windowRange(line, extent, 0, extent[1])).toBeNull()
    expect(windowRange(line, extent, -5, extent[1] + 5)).toBeNull()
  })

  it('a window with points inside gives those points', () => {
    expect(windowRange(line, extent, line.data[10][0], line.data[20][0])).toEqual([10, 20])
  })

  it('a window inside the pause takes the points nearest its edges', () => {
    const b = line.dataToPoint.indexOf(-1)
    const [pauseStart, pauseEnd] = [line.data[b - 1][0], line.data[b + 1][0]]
    expect(windowRange(line, extent, pauseStart + 1, pauseEnd - 1)).toEqual([
      line.dataToPoint[b - 1],
      line.dataToPoint[b + 1],
    ])
  })
})
