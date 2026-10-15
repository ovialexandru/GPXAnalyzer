import { screen, within } from '@testing-library/react'
import { getTrackMetrics } from '../../metrics/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import { charts, init, lastOption, resetEChartsMock } from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore as render } from '../../test/viewStore.tsx'
import { SensorChart } from './index.ts'
import type { SensorKind } from './sensorOption.ts'
import type { XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function chartFor(text: string, kind: SensorKind, mode: XAxisMode = 'distance') {
  const track = parseTrack(text)
  return <SensorChart track={track} metrics={getTrackMetrics(track)} mode={mode} kind={kind} />
}

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
})

describe('SensorChart', () => {
  it.each([
    ['heartRate', 'Heart rate'],
    ['cadence', 'Cadence'],
  ] as const)('%s: a region and heading named "%s"', (kind, name) => {
    render(chartFor(run, kind))
    const region = screen.getByRole('region', { name: `${name} chart` })
    expect(within(region).getByRole('heading', { name })).toBeInTheDocument()
    expect(region).toContainElement(charts[0].node)
    expect(charts[0].setOption.mock.lastCall?.[1]).toEqual({ notMerge: true })
  })

  it('a new track or mode replaces the option on the same chart', () => {
    const { rerender } = render(chartFor(run, 'heartRate'))
    rerender(chartFor(bike, 'heartRate'))
    expect(lastOption(charts[0]).series[0].data).toHaveLength(200)
    rerender(chartFor(bike, 'heartRate', 'time'))
    expect(lastOption(charts[0]).xAxis).toMatchObject({ max: 717 })
    expect(init).toHaveBeenCalledTimes(1)
  })

  it('its own axis pointer sets the hover with its kind as the source', () => {
    const { store } = render(chartFor(run, 'cadence'))
    charts[0].emit('updateAxisPointer', { axesInfo: [{ axisDim: 'x', value: 0.5 }] })
    flushFrame()
    expect(store.getState().hover).toMatchObject({ source: 'cadence' })
  })

  it('a zoom on the chart reaches the store', () => {
    const { store } = render(chartFor(run, 'heartRate'), { pointCount: 150 })
    charts[0].emit('datazoom', { batch: [{ start: 20, end: 60 }] })
    flushFrame()
    expect(store.getState().zoom).not.toBeNull()
  })

  it('a brush on the chart sets the selection', () => {
    const { store } = render(chartFor(run, 'heartRate'))
    charts[0].emit('brush', { areas: [{ coordRange: [0.3, 0.6] }] })
    flushFrame()
    expect(store.getState().selection).not.toBeNull()
  })
})
