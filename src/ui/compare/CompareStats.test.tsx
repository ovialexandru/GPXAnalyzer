import { fireEvent, screen, within } from '@testing-library/react'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { UnitsProvider, UnitsToggle } from '../units/index.ts'
import { ComparisonProvider } from './ComparisonContext.tsx'
import { getTrackEntries } from './comparison.ts'
import { CompareStats } from './index.ts'

const runA = parseTrack(run)
const runBTrack = parseTrack(runB)

function renderStats(a: Track, b: Track, onRemove = vi.fn()) {
  const entries = getTrackEntries([
    { fileName: 'a.gpx', track: a },
    { fileName: 'b.gpx', track: b },
  ])
  const result = renderWithViewStore(
    <UnitsProvider>
      <UnitsToggle />
      <ComparisonProvider entries={entries} chosenMode="distance">
        <CompareStats onRemove={onRemove} />
      </ComparisonProvider>
    </UnitsProvider>,
  )
  return { ...result, onRemove }
}

/** The table as rows of cell text, the header row first. */
function cells(): string[][] {
  const table = screen.getByRole('table')
  return within(table)
    .getAllByRole('row')
    .map((row) => [...row.querySelectorAll('th, td')].map((c) => c.textContent ?? ''))
}

function row(label: string): string[] {
  const found = cells().find((r) => r[0] === label)
  if (!found) throw new Error(`no row ${label}`)
  return found.slice(1)
}

beforeEach(() => {
  stubAnimationFrames()
})

describe('CompareStats', () => {
  it('chips with each track’s letter and name, and remove buttons', () => {
    const { onRemove } = renderStats(runA, runBTrack)
    const chips = within(screen.getByRole('list', { name: 'Tracks' })).getAllByRole('listitem')
    expect(chips.map((c) => c.textContent)).toEqual(['ARun fixture×', 'BRun B fixture×'])
    fireEvent.click(screen.getByRole('button', { name: 'Remove Run B fixture' }))
    expect(onRemove).toHaveBeenCalledWith('b')
    fireEvent.click(screen.getByRole('button', { name: 'Remove Run fixture' }))
    expect(onRemove).toHaveBeenLastCalledWith('a')
  })

  it('a table of A and B, the summary rows in order, then the available data', () => {
    renderStats(runA, runBTrack)
    const table = screen.getByRole('table', { name: 'Track comparison' })
    expect(within(table).getByRole('columnheader', { name: 'A · Run fixture' })).toBeInTheDocument()
    expect(
      within(table).getByRole('columnheader', { name: 'B · Run B fixture' }),
    ).toBeInTheDocument()
    expect(cells().map((r) => r[0])).toEqual([
      '',
      'Distance',
      'Duration',
      'Elevation gain',
      'Avg speed',
      'Max speed',
      'Avg HR',
      'Max HR',
      'Avg cadence',
      'Max cadence',
      'Available data',
    ])
    expect(row('Distance')[0]).toBe('1.47 km')
    expect(row('Duration')[0]).toBe('10:44')
    expect(row('Avg speed')[0]).toBe('8.2 km/h')
    // B: shorter and 10% slower; no cadence.
    expect(parseFloat(row('Distance')[1])).toBeLessThan(1.47)
    expect(parseFloat(row('Avg speed')[1])).toBeLessThan(8.2)
    expect(row('Avg cadence')).toEqual(['69 rpm', '–'])
    expect(row('Available data')).toEqual([
      'Elevation, Time, Heart rate, Cadence',
      'Elevation, Time, Heart rate',
    ])
  })

  it('values follow the units', () => {
    renderStats(runA, runBTrack)
    fireEvent.click(screen.getByRole('radio', { name: 'Imperial' }))
    expect(row('Distance')[0]).toMatch(/ mi$/)
    expect(row('Distance')[1]).toMatch(/ mi$/)
    expect(row('Avg speed')[1]).toMatch(/ mph$/)
  })

  it('a selection shows each track’s stats for its own part, live', () => {
    const { store } = renderStats(runA, runBTrack)
    const whole = row('Distance')
    store.setSelection([20, 80])
    flushFrame()
    expect(screen.getByRole('table', { name: 'Selection comparison' })).toBeInTheDocument()
    expect(screen.getByText(/^Selection · /)).toHaveTextContent(
      /^Selection · [\d.]+ k?m – [\d.]+ k?m$/,
    )
    const selected = row('Distance')
    expect(selected).not.toEqual(whole)
    // About the same stretch of the same route: B's range is inside the same distances, so
    // each end may be up to one point (~11 m) in.
    const meters = (t: string) => parseFloat(t) * (t.endsWith(' km') ? 1000 : 1)
    expect(Math.abs(meters(selected[0]) - meters(selected[1]))).toBeLessThan(30)

    store.setSelection([20, 100])
    flushFrame()
    expect(parseFloat(row('Distance')[0])).toBeGreaterThan(parseFloat(selected[0]))

    fireEvent.click(screen.getByRole('button', { name: 'Show whole track' }))
    flushFrame()
    expect(store.getState().selection).toBeNull()
    expect(row('Distance')).toEqual(whole)
  })

  it('a selection past the end of B: "Not in selection" and "–" for B', () => {
    const { store } = renderStats(runA, runBTrack)
    store.setSelection([135, 149])
    flushFrame()
    const header = screen.getByRole('columnheader', { name: 'B · Run B fixture' })
    expect(header).toHaveTextContent('Not in selection')
    expect(row('Distance')[1]).toBe('–')
    expect(row('Distance')[0]).not.toBe('–')
  })

  it('rows no track has a value for are left out', () => {
    renderStats(parseTrack(noEleTime), parseTrack(noEleTime))
    expect(cells().map((r) => r[0])).toEqual(['', 'Distance', 'Available data'])
    expect(row('Available data')).toEqual(['–', '–'])
  })

  it('renders nothing without a comparison', () => {
    const { container } = renderWithViewStore(
      <UnitsProvider>
        <CompareStats onRemove={() => {}} />
      </UnitsProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
