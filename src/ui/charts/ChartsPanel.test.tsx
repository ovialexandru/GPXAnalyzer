import { fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics } from '../../metrics/index.ts'
import { init, lastOption, liveCharts, resetEChartsMock } from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore as render } from '../../test/viewStore.tsx'
import { ChartsPanel } from './index.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function panelFor(text: string) {
  const track = parseTrack(text)
  return <ChartsPanel track={track} metrics={getTrackMetrics(track)} />
}

function xAxisRadio(name: 'Distance' | 'Time') {
  return within(screen.getByRole('group', { name: 'X axis' })).getByRole('radio', { name })
}

/** The x-axis option of each live chart (elevation first, then speed). */
function xAxes() {
  return liveCharts().map((c) => lastOption(c).xAxis)
}

beforeEach(() => {
  resetEChartsMock()
})

describe('ChartsPanel', () => {
  it('renders the toggle, the elevation chart and the speed chart', () => {
    render(panelFor(run))
    expect(screen.getByRole('group', { name: 'X axis' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Elevation chart' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Speed chart' })).toBeInTheDocument()
    expect(init).toHaveBeenCalledTimes(2)
  })

  it('defaults to Distance; choosing Time switches both charts', () => {
    render(panelFor(run))
    expect(xAxisRadio('Distance')).toBeChecked()
    for (const axis of xAxes()) expect(axis.max).toBeCloseTo(1.469, 3)

    fireEvent.click(xAxisRadio('Time'))
    expect(xAxisRadio('Time')).toBeChecked()
    expect(xAxes()).toEqual([
      expect.objectContaining({ max: 644, interval: 120 }),
      expect.objectContaining({ max: 644, interval: 120 }),
    ])

    fireEvent.click(xAxisRadio('Distance'))
    for (const axis of xAxes()) expect(axis.max).toBeCloseTo(1.469, 3)
  })

  it('no timestamps: Time disabled with a hint, Distance checked', () => {
    render(panelFor(noEleTime))
    expect(xAxisRadio('Time')).toBeDisabled()
    expect(xAxisRadio('Time').closest('label')).toHaveAttribute(
      'title',
      'No timestamps in this track',
    )
    expect(xAxisRadio('Distance')).toBeChecked()
  })

  it('the Time choice survives a track without time and applies to the next timed track', () => {
    const { rerender } = render(panelFor(run))
    fireEvent.click(xAxisRadio('Time'))

    rerender(panelFor(noEleTime))
    expect(xAxisRadio('Distance')).toBeChecked()
    expect(liveCharts()).toHaveLength(0)

    rerender(panelFor(bike))
    expect(xAxisRadio('Time')).toBeChecked()
    expect(xAxes()).toEqual([
      expect.objectContaining({ max: 717 }),
      expect.objectContaining({ max: 717 }),
    ])
  })

  it('another track keeps both chart instances and the Pace choice', () => {
    const { rerender } = render(panelFor(run))
    const speed = screen.getByRole('region', { name: 'Speed chart' })
    fireEvent.click(within(speed).getByRole('radio', { name: 'Pace' }))
    rerender(panelFor(bike))
    expect(init).toHaveBeenCalledTimes(2)
    expect(liveCharts()).toHaveLength(2)
    expect(within(speed).getByRole('radio', { name: 'Pace' })).toBeChecked()
  })
})
