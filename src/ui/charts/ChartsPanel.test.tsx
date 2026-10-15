import { fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import {
  init,
  lastOption,
  liveCharts,
  resetEChartsMock,
  type FakeChart,
} from '../../test/echartsMock.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore as render } from '../../test/viewStore.tsx'
import { ChartsPanel } from './index.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

function panelFor(text: string) {
  return panelForTrack(parseTrack(text))
}

function panelForTrack(track: Track) {
  return <ChartsPanel track={track} metrics={getTrackMetrics(track)} />
}

function resetButton() {
  return screen.getByRole('button', { name: 'Reset zoom' })
}

function zoomToSelectionButton() {
  return screen.getByRole('button', { name: 'Zoom to selection' })
}

function clearButton() {
  return screen.getByRole('button', { name: 'Clear selection' })
}

/** The dataZoom types in a chart's option, e.g. ['inside', 'slider']. */
function zoomTypes(chart: FakeChart) {
  return lastOption(chart).dataZoom.map((z: { type: string }) => z.type)
}

function xAxisRadio(name: 'Distance' | 'Time') {
  return within(screen.getByRole('group', { name: 'X axis' })).getByRole('radio', { name })
}

/** The x-axis option of each live chart. */
function xAxes() {
  return liveCharts().map((c) => lastOption(c).xAxis)
}

/** The live chart inside the region with this accessible name. */
function chartIn(name: string): FakeChart {
  const region = screen.getByRole('region', { name })
  const chart = liveCharts().find((c) => region.contains(c.node))
  if (!chart) throw new Error(`no chart in ${name}`)
  return chart
}

const CHART_REGIONS = ['Speed chart', 'Elevation chart', 'Heart rate chart', 'Cadence chart']

/** Accessible names of the chart regions, in page order. */
function chartRegions(): string[] {
  return screen
    .getAllByRole('region')
    .map((r) => r.getAttribute('aria-label') ?? '')
    .filter((name) => CHART_REGIONS.includes(name))
}

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
})

describe('ChartsPanel', () => {
  it('run.gpx: the toggle and four charts: speed, elevation, heart rate, cadence', () => {
    render(panelFor(run))
    expect(screen.getByRole('group', { name: 'X axis' })).toBeInTheDocument()
    expect(chartRegions()).toEqual(CHART_REGIONS)
    expect(init).toHaveBeenCalledTimes(4)
  })

  it('bike.gpx (HR, no cadence): no cadence card', () => {
    render(panelFor(bike))
    expect(chartRegions()).toEqual(['Speed chart', 'Elevation chart', 'Heart rate chart'])
  })

  it('no-ele-time.gpx: no heart rate or cadence card', () => {
    render(panelFor(noEleTime))
    expect(chartRegions()).toEqual(['Speed chart', 'Elevation chart'])
  })

  it('defaults to Distance; choosing Time switches both charts', () => {
    render(panelFor(run))
    expect(xAxisRadio('Distance')).toBeChecked()
    for (const axis of xAxes()) expect(axis.max).toBeCloseTo(1.469, 3)

    fireEvent.click(xAxisRadio('Time'))
    expect(xAxisRadio('Time')).toBeChecked()
    expect(xAxes()).toHaveLength(4)
    for (const axis of xAxes()) expect(axis).toMatchObject({ max: 644, interval: 120 })

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
    expect(xAxes()).toHaveLength(3)
    for (const axis of xAxes()) expect(axis).toMatchObject({ max: 717 })
  })

  it('another track keeps the chart instances and the Pace choice; cadence goes away', () => {
    const { rerender } = render(panelFor(run))
    const speed = screen.getByRole('region', { name: 'Speed chart' })
    fireEvent.click(within(speed).getByRole('radio', { name: 'Pace' }))
    rerender(panelFor(bike))
    expect(init).toHaveBeenCalledTimes(4)
    expect(liveCharts()).toHaveLength(3)
    expect(within(speed).getByRole('radio', { name: 'Pace' })).toBeChecked()
  })

  it('Reset zoom: disabled until zoomed; clicking it clears the zoom and disables it again', () => {
    const { store } = render(panelFor(run))
    expect(resetButton()).toBeDisabled()

    store.setZoom([20, 60])
    flushFrame()
    expect(resetButton()).toBeEnabled()

    fireEvent.click(resetButton())
    expect(store.getState().zoom).toBeNull()
    flushFrame()
    expect(resetButton()).toBeDisabled()
  })

  it('run.gpx: the slider is only under the cadence chart', () => {
    render(panelFor(run))
    for (const name of ['Elevation chart', 'Speed chart', 'Heart rate chart']) {
      expect(zoomTypes(chartIn(name))).toEqual(['inside'])
    }
    expect(zoomTypes(chartIn('Cadence chart'))).toEqual(['inside', 'slider'])
    const height = (chart: FakeChart) => parseFloat(chart.node.style.height)
    expect(height(chartIn('Cadence chart'))).toBeGreaterThan(height(chartIn('Speed chart')))
  })

  it('bike.gpx: the slider is under the heart rate chart', () => {
    render(panelFor(bike))
    expect(zoomTypes(chartIn('Speed chart'))).toEqual(['inside'])
    expect(zoomTypes(chartIn('Heart rate chart'))).toEqual(['inside', 'slider'])
  })

  it('without sensors, the slider is under the elevation chart', () => {
    const track = parseTrack(run)
    for (const p of track.points) {
      delete p.hr
      delete p.cad
    }
    render(panelForTrack(track))
    expect(zoomTypes(chartIn('Speed chart'))).toEqual(['inside'])
    expect(zoomTypes(chartIn('Elevation chart'))).toEqual(['inside', 'slider'])
  })

  it('without sensors or elevation, the slider is under the speed chart', () => {
    const track = parseTrack(run)
    for (const p of track.points) {
      delete p.hr
      delete p.cad
      delete p.ele
    }
    render(panelForTrack(track))
    expect(liveCharts()).toHaveLength(1)
    expect(zoomTypes(chartIn('Speed chart'))).toEqual(['inside', 'slider'])
  })

  it('the slider moves to the elevation chart when the speed chart is empty', () => {
    const track = parseTrack(run)
    for (const p of track.points) {
      delete p.time
      delete p.hr
      delete p.cad
    }
    render(panelForTrack(track))
    expect(liveCharts()).toHaveLength(1)
    expect(zoomTypes(liveCharts()[0])).toEqual(['inside', 'slider'])
  })

  it('no elevation or time: no charts, Reset shown disabled', () => {
    render(panelFor(noEleTime))
    expect(liveCharts()).toHaveLength(0)
    expect(resetButton()).toBeDisabled()
  })

  it('no elevation or time: the selection buttons are shown disabled', () => {
    render(panelFor(noEleTime))
    expect(zoomToSelectionButton()).toBeDisabled()
    expect(clearButton()).toBeDisabled()
  })
})

describe('ChartsPanel selection actions', () => {
  it('Zoom to selection and Clear selection are disabled until something is selected', () => {
    const { store } = render(panelFor(run))
    expect(zoomToSelectionButton()).toBeDisabled()
    expect(clearButton()).toBeDisabled()

    store.setSelection([20, 60])
    flushFrame()
    expect(zoomToSelectionButton()).toBeEnabled()
    expect(clearButton()).toBeEnabled()
  })

  it('Zoom to selection sets the zoom to the selection and keeps the selection', () => {
    const { store } = render(panelFor(run), { pointCount: 150 })
    store.setSelection([20, 60])
    flushFrame()
    fireEvent.click(zoomToSelectionButton())
    expect(store.getState().zoom).toEqual([20, 60])
    expect(store.getState().selection).toEqual([20, 60])
    flushFrame()
    expect(resetButton()).toBeEnabled()
  })

  it('Clear selection clears it and disables both buttons; the zoom stays', () => {
    const { store } = render(panelFor(run))
    store.setZoom([10, 90])
    store.setSelection([20, 60])
    flushFrame()
    fireEvent.click(clearButton())
    expect(store.getState().selection).toBeNull()
    expect(store.getState().zoom).toEqual([10, 90])
    flushFrame()
    expect(zoomToSelectionButton()).toBeDisabled()
    expect(clearButton()).toBeDisabled()
  })

  it('Esc clears the selection, also with focus on the x-axis toggle', () => {
    const { store } = render(panelFor(run))
    store.setSelection([20, 60])
    flushFrame()
    fireEvent.keyDown(xAxisRadio('Time'), { key: 'Escape' })
    expect(store.getState().selection).toBeNull()

    store.setSelection([20, 60])
    flushFrame()
    fireEvent.keyDown(document.body, { key: 'Escape' })
    expect(store.getState().selection).toBeNull()
  })

  it('Esc in a text field, or another key, does nothing', () => {
    const { store } = render(
      <>
        {panelFor(run)}
        <input type="text" aria-label="Note" />
        <textarea aria-label="Notes" />
      </>,
    )
    store.setSelection([20, 60])
    flushFrame()
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Note' }), { key: 'Escape' })
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Notes' }), { key: 'Escape' })
    fireEvent.keyDown(document.body, { key: 'Enter' })
    expect(store.getState().selection).toEqual([20, 60])
  })

  it('Esc is not listened for without a selection', () => {
    const add = vi.spyOn(window, 'addEventListener')
    const { store } = render(panelFor(run))
    expect(add).not.toHaveBeenCalledWith('keydown', expect.any(Function))
    store.setSelection([20, 60])
    flushFrame()
    expect(add).toHaveBeenCalledWith('keydown', expect.any(Function))
    const remove = vi.spyOn(window, 'removeEventListener')
    store.setSelection(null)
    flushFrame()
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function))
    add.mockRestore()
    remove.mockRestore()
  })
})

describe('ChartsPanel collapsing', () => {
  function toggle(name: string) {
    const region = screen.getByRole('region', { name: `${name} chart` })
    return within(region).getByRole('button', { name })
  }

  it('every chart starts expanded with a toggle in its heading', () => {
    render(panelFor(run))
    for (const name of ['Speed', 'Elevation', 'Heart rate', 'Cadence']) {
      expect(toggle(name)).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('heading', { name })).toContainElement(toggle(name))
    }
  })

  it('collapsing disposes the chart and hides its controls; expanding brings it back', () => {
    render(panelFor(run))
    const speed = screen.getByRole('region', { name: 'Speed chart' })
    fireEvent.click(toggle('Speed'))
    expect(toggle('Speed')).toHaveAttribute('aria-expanded', 'false')
    expect(liveCharts()).toHaveLength(3)
    expect(within(speed).queryByRole('radio', { name: 'Pace' })).not.toBeInTheDocument()

    fireEvent.click(toggle('Speed'))
    expect(toggle('Speed')).toHaveAttribute('aria-expanded', 'true')
    expect(liveCharts()).toHaveLength(4)
    expect(speed).toContainElement(liveCharts().at(-1)!.node)
  })

  it('a collapsed chart gets the zoom and selection back when expanded', () => {
    const { store } = render(panelFor(run), { pointCount: 150 })
    fireEvent.click(toggle('Elevation'))
    store.setZoom([20, 60])
    store.setSelection([30, 50])
    flushFrame()
    fireEvent.click(toggle('Elevation'))
    const elevation = chartIn('Elevation chart')
    const types = elevation.dispatchAction.mock.calls.map(([p]) => p.type)
    expect(types).toContain('dataZoom')
    expect(types).toContain('brush')
  })

  it('the slider moves to the last expanded chart with data', () => {
    render(panelFor(run))
    fireEvent.click(toggle('Cadence'))
    expect(zoomTypes(chartIn('Heart rate chart'))).toEqual(['inside', 'slider'])
    fireEvent.click(toggle('Heart rate'))
    fireEvent.click(toggle('Elevation'))
    expect(zoomTypes(chartIn('Speed chart'))).toEqual(['inside', 'slider'])
  })

  it('the collapsed charts are remembered for the next track and visit', () => {
    const { rerender, unmount } = render(panelFor(run))
    fireEvent.click(toggle('Heart rate'))
    rerender(panelFor(bike))
    expect(toggle('Heart rate')).toHaveAttribute('aria-expanded', 'false')
    unmount()
    render(panelFor(run))
    expect(toggle('Heart rate')).toHaveAttribute('aria-expanded', 'false')
    expect(toggle('Speed')).toHaveAttribute('aria-expanded', 'true')
  })

  it('an empty chart (no elevation) collapses too', () => {
    render(panelFor(noEleTime))
    fireEvent.click(toggle('Elevation'))
    expect(screen.queryByText('This track has no elevation data.')).not.toBeInTheDocument()
  })
})
