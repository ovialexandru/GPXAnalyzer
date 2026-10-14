import { fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics } from '../../metrics/index.ts'
import { charts, init, lastOption, resetEChartsMock } from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore as render } from '../../test/viewStore.tsx'
import { SpeedChart } from './index.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function chartFor(text: string) {
  const track = parseTrack(text)
  return <SpeedChart track={track} metrics={getTrackMetrics(track)} mode="distance" />
}

function region() {
  return screen.getByRole('region', { name: 'Speed chart' })
}

beforeEach(() => {
  resetEChartsMock()
})

describe('SpeedChart', () => {
  it('run.gpx: chart created showing Speed', () => {
    render(chartFor(run))
    expect(init).toHaveBeenCalledTimes(1)
    expect(within(region()).getByRole('heading', { name: 'Speed' })).toBeInTheDocument()
    expect(within(region()).getByRole('radio', { name: 'Speed' })).toBeChecked()
    const option = lastOption(charts[0])
    expect(option.yAxis).toMatchObject({ min: 0 })
    expect(option.yAxis.inverse).toBeUndefined()
    expect(charts[0].setOption.mock.lastCall?.[1]).toEqual({ notMerge: true })
  })

  it('choosing Pace switches to an inverted axis and renames the heading', () => {
    render(chartFor(run))
    fireEvent.click(within(region()).getByRole('radio', { name: 'Pace' }))
    expect(within(region()).getByRole('heading', { name: 'Pace' })).toBeInTheDocument()
    expect(init).toHaveBeenCalledTimes(1)
    expect(lastOption(charts[0]).yAxis).toMatchObject({ inverse: true })
  })

  it('keeps the Pace choice and the chart for the next track', () => {
    const { rerender } = render(chartFor(run))
    fireEvent.click(within(region()).getByRole('radio', { name: 'Pace' }))
    rerender(chartFor(bike))
    expect(init).toHaveBeenCalledTimes(1)
    expect(within(region()).getByRole('radio', { name: 'Pace' })).toBeChecked()
    expect(lastOption(charts[0]).series[0].data).toHaveLength(200)
    expect(lastOption(charts[0]).yAxis).toMatchObject({ inverse: true })
  })

  it('no timestamps: empty state, no switch and no chart', () => {
    render(chartFor(noEleTime))
    expect(init).not.toHaveBeenCalled()
    expect(
      within(region()).getByText("This track has no timestamps, so speed and pace can't be shown."),
    ).toBeInTheDocument()
    expect(within(region()).queryByRole('radio')).not.toBeInTheDocument()
  })
})
