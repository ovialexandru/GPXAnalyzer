import { fireEvent, screen, within } from '@testing-library/react'
import { getTrackMetrics } from '../../metrics/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { TrackSummary } from './TrackSummary.tsx'

function renderSummary(text: string, fileName: string) {
  const track = parseTrack(text)
  return renderWithViewStore(
    <TrackSummary loaded={{ fileName, track }} metrics={getTrackMetrics(track)} />,
  )
}

/** The stats `dl` as label → value, found by its accessible name. */
function stats(name: string): Record<string, string> {
  const dl = document.querySelector('dl')!
  expect(dl).toHaveAccessibleName(name)
  return Object.fromEntries(
    [...dl.querySelectorAll('dt')].map((dt) => [
      dt.textContent,
      dt.nextElementSibling!.textContent,
    ]),
  )
}

const WHOLE_RUN = {
  Distance: '1.47 km',
  Duration: '10:44',
  'Elevation gain': '6 m',
  'Avg speed': '8.2 km/h',
  'Max speed': '13.6 km/h',
  'Avg HR': '144 bpm',
  'Max HR': '159 bpm',
  'Avg cadence': '69 rpm',
  'Max cadence': '79 rpm',
}

describe('TrackSummary', () => {
  beforeEach(() => stubAnimationFrames())

  it('without a selection: the whole-track stats, no selection line', () => {
    renderSummary(run, 'run.gpx')
    expect(stats('Whole-track stats')).toEqual(WHOLE_RUN)
    expect(screen.queryByText(/^Selection ·/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show whole track' })).not.toBeInTheDocument()
  })

  it('with a selection: its stats and the selection line', () => {
    const { store } = renderSummary(run, 'run.gpx')
    store.setSelection([30, 119])
    flushFrame()
    // Reference values in the Phase 13 requirements.
    expect(stats('Selection stats')).toEqual({
      Distance: '844 m',
      Duration: '5:59',
      'Elevation gain': '3 m',
      'Avg speed': '8.5 km/h',
      'Max speed': '13.6 km/h',
      'Avg HR': '150 bpm',
      'Max HR': '159 bpm',
      'Avg cadence': '71 rpm',
      'Max cadence': '77 rpm',
    })
    const metrics = getTrackMetrics(parseTrack(run))
    const from = metrics.distance[30]
    const to = metrics.distance[119]
    expect(from).toBeLessThan(1000)
    expect(
      screen.getByText(`Selection · ${Math.round(from)} m – ${(to / 1000).toFixed(2)} km`),
    ).toBeInTheDocument()
  })

  it('"Show whole track" clears the selection', () => {
    const { store } = renderSummary(run, 'run.gpx')
    store.setSelection([30, 119])
    flushFrame()
    fireEvent.click(screen.getByRole('button', { name: 'Show whole track' }))
    flushFrame()
    expect(store.getState().selection).toBeNull()
    expect(stats('Whole-track stats')).toEqual(WHOLE_RUN)
    expect(screen.queryByText(/^Selection ·/)).not.toBeInTheDocument()
  })

  it('bike.gpx: Max HR but no cadence stats', () => {
    renderSummary(bike, 'bike.gpx')
    const s = stats('Whole-track stats')
    expect(s['Max HR']).toBe('166 bpm')
    expect(s).not.toHaveProperty('Avg cadence')
    expect(s).not.toHaveProperty('Max cadence')
  })

  it('a selection on a track without time or elevation shows only the distance', () => {
    const { store } = renderSummary(noEleTime, 'no-ele-time.gpx')
    store.setSelection([10, 59])
    flushFrame()
    expect(stats('Selection stats')).toEqual({ Distance: '1.15 km' })
  })

  it('keeps the heading and badges while a selection is shown', () => {
    const { store } = renderSummary(run, 'run.gpx')
    store.setSelection([30, 119])
    flushFrame()
    expect(screen.getByRole('heading', { name: 'Run fixture' })).toBeInTheDocument()
    const badges = screen.getByRole('list', { name: 'Available data' })
    expect(within(badges).getAllByRole('listitem')).toHaveLength(4)
  })
})
