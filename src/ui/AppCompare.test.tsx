import { fireEvent, render, screen, within } from '@testing-library/react'
import { resetEChartsMock } from '../test/echartsMock.ts'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import runB from '../test/fixtures/run-b.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { resetLeafletMock } from '../test/leafletMock.ts'
import App from './App.tsx'

// jsdom has no layout or canvas; the map's and the charts' own tests cover the library calls.
vi.mock('leaflet', () => import('../test/leafletMock.ts'))
vi.mock('echarts/core', () => import('../test/echartsMock.ts'))

function gpxFile(content: string, name: string): File {
  return new File([content], name, { type: 'application/gpx+xml' })
}

function renderApp() {
  const { container } = render(<App />)
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found')
  const pick = (...files: File[]) => fireEvent.change(input, { target: { files } })
  return {
    pick,
    drop: (...files: File[]) =>
      fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files } }),
    /** "Compare with…", then pick the file in the (same) input. */
    compare: (file: File) => {
      fireEvent.click(screen.getByRole('button', { name: 'Compare with…' }))
      pick(file)
    },
  }
}

/** Chip names in order. */
async function chipNames(): Promise<string[]> {
  const list = await screen.findByRole('list', { name: 'Tracks' })
  return within(list)
    .getAllByRole('listitem')
    .map((li) => li.textContent?.replace(/×$/, '') ?? '')
}

beforeEach(() => {
  resetLeafletMock()
  resetEChartsMock()
})

describe('App: comparing two tracks', () => {
  it('"Compare with…" appears once a track is loaded', async () => {
    const app = renderApp()
    expect(screen.queryByRole('button', { name: 'Compare with…' })).not.toBeInTheDocument()
    app.pick(gpxFile(run, 'run.gpx'))
    await screen.findByRole('region', { name: 'Loaded track' })
    expect(screen.getByRole('button', { name: 'Compare with…' })).toBeEnabled()
  })

  it('"Compare with…" adds B; again, it replaces B', async () => {
    const app = renderApp()
    app.pick(gpxFile(run, 'run.gpx'))
    await screen.findByRole('region', { name: 'Loaded track' })

    app.compare(gpxFile(runB, 'run-b.gpx'))
    expect(await chipNames()).toEqual(['ARun fixture', 'BRun B fixture'])
    expect(screen.queryByRole('region', { name: 'Loaded track' })).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Track comparison' })).toBeInTheDocument()

    app.compare(gpxFile(noEleTime, 'no-ele-time.gpx'))
    await screen.findByText('No elevation or time fixture')
    expect(await chipNames()).toEqual(['ARun fixture', 'BNo elevation or time fixture'])
  })

  it('dropping two files loads both, A first', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'), gpxFile(runB, 'run-b.gpx'))
    expect(await chipNames()).toEqual(['ARun fixture', 'BRun B fixture'])
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('removing B returns to the single-track summary', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'), gpxFile(runB, 'run-b.gpx'))
    await chipNames()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Run B fixture' }))
    const summary = await screen.findByRole('region', { name: 'Loaded track' })
    expect(within(summary).getByRole('heading', { name: 'Run fixture' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tracks' })).not.toBeInTheDocument()
  })

  it('removing A makes B the new A', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'), gpxFile(runB, 'run-b.gpx'))
    await chipNames()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Run fixture' }))
    const summary = await screen.findByRole('region', { name: 'Loaded track' })
    expect(within(summary).getByRole('heading', { name: 'Run B fixture' })).toBeInTheDocument()
  })

  it('a bad B keeps A alone, and the error names the file', async () => {
    const app = renderApp()
    app.pick(gpxFile(run, 'run.gpx'))
    await screen.findByRole('region', { name: 'Loaded track' })
    app.compare(gpxFile('<gpx', 'bad.gpx'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText("Couldn't open bad.gpx")).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Loaded track' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tracks' })).not.toBeInTheDocument()
  })

  it('one bad file of two: the good one loads alone, the error names the bad one', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'), gpxFile('hello', 'notes.txt'))
    const alert = await screen.findByRole('alert')
    expect(within(alert).getByText("Couldn't open notes.txt")).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Loaded track' })).toHaveTextContent('run.gpx')
  })

  it('a bad file never removes the loaded pair', async () => {
    const app = renderApp()
    app.drop(gpxFile(run, 'run.gpx'), gpxFile(runB, 'run-b.gpx'))
    await chipNames()
    app.pick(gpxFile('hello', 'notes.txt'))
    await screen.findByRole('alert')
    expect(await chipNames()).toEqual(['ARun fixture', 'BRun B fixture'])
  })

  it('"Choose file" with one file starts over with a single track', async () => {
    const app = renderApp()
    app.drop(gpxFile(run, 'run.gpx'), gpxFile(runB, 'run-b.gpx'))
    await chipNames()
    app.pick(gpxFile(runB, 'run-b.gpx'))
    const summary = await screen.findByRole('region', { name: 'Loaded track' })
    expect(within(summary).getByRole('heading', { name: 'Run B fixture' })).toBeInTheDocument()
  })
})
