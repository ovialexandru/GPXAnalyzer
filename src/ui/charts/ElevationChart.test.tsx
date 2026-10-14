import { render, screen, within } from '@testing-library/react'
import { StrictMode } from 'react'
import { getTrackMetrics } from '../../metrics/index.ts'
import {
  charts,
  FakeResizeObserver,
  init,
  lastOption,
  liveCharts,
  resetEChartsMock,
} from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { ElevationChart } from './index.ts'
import type { XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

const EMPTY = 'This track has no elevation data.'

function chartFor(text: string, mode: XAxisMode = 'distance') {
  const track = parseTrack(text)
  return <ElevationChart track={track} metrics={getTrackMetrics(track)} mode={mode} />
}

function region() {
  return screen.getByRole('region', { name: 'Elevation chart' })
}

beforeEach(() => {
  resetEChartsMock()
})

describe('ElevationChart', () => {
  it('run.gpx: one canvas chart with 150 data pairs, replacing the option', () => {
    render(chartFor(run))
    expect(within(region()).getByRole('heading', { name: 'Elevation' })).toBeInTheDocument()
    expect(init).toHaveBeenCalledTimes(1)
    expect(init).toHaveBeenCalledWith(expect.any(HTMLDivElement), undefined, {
      renderer: 'canvas',
    })
    expect(region()).toContainElement(charts[0].node)
    expect(lastOption(charts[0]).series[0].data).toHaveLength(150)
    expect(charts[0].setOption.mock.lastCall?.[1]).toEqual({ notMerge: true })
  })

  it('a new track updates the same chart', () => {
    const { rerender } = render(chartFor(run))
    rerender(chartFor(bike))
    expect(init).toHaveBeenCalledTimes(1)
    expect(charts[0].setOption).toHaveBeenCalledTimes(2)
    expect(lastOption(charts[0]).series[0].data).toHaveLength(200)
    expect(charts[0].setOption.mock.lastCall?.[1]).toEqual({ notMerge: true })
  })

  it('a mode change updates the same chart', () => {
    const { rerender } = render(chartFor(bike))
    rerender(chartFor(bike, 'time'))
    expect(init).toHaveBeenCalledTimes(1)
    expect(lastOption(charts[0]).xAxis).toMatchObject({ max: 717 })
  })

  it('no elevation: empty state and no chart', () => {
    render(chartFor(noEleTime))
    expect(init).not.toHaveBeenCalled()
    expect(within(region()).getByText(EMPTY)).toBeInTheDocument()
  })

  it('switching to a track without elevation disposes the chart; back creates a new one', () => {
    const { rerender } = render(chartFor(run))
    rerender(chartFor(noEleTime))
    expect(charts[0].dispose).toHaveBeenCalledTimes(1)
    expect(charts[0].setOption).toHaveBeenCalledTimes(1)
    expect(within(region()).getByText(EMPTY)).toBeInTheDocument()

    rerender(chartFor(run))
    expect(init).toHaveBeenCalledTimes(2)
    expect(lastOption(charts[1]).series[0].data).toHaveLength(150)
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument()
  })

  it('resizes with its container', () => {
    render(chartFor(run))
    expect(FakeResizeObserver.instances[0].observe).toHaveBeenCalledWith(charts[0].node)
    FakeResizeObserver.instances[0].trigger()
    expect(charts[0].resize).toHaveBeenCalledTimes(1)
  })

  it('unmount disposes the chart and disconnects the observer', () => {
    const { unmount } = render(chartFor(run))
    unmount()
    expect(charts[0].dispose).toHaveBeenCalledTimes(1)
    expect(FakeResizeObserver.instances[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('StrictMode double mount leaves one live chart with the data', () => {
    render(<StrictMode>{chartFor(run)}</StrictMode>)
    expect(liveCharts()).toHaveLength(1)
    expect(lastOption(liveCharts()[0]).series[0].data).toHaveLength(150)
  })
})
