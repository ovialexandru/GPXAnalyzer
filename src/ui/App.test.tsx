import { fireEvent, render, screen, within } from '@testing-library/react'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import App from './App.tsx'

// jsdom has no layout or canvas; TrackMap's own tests cover the Leaflet calls.
vi.mock('leaflet', () => import('../test/leafletMock.ts'))

function gpxFile(content: string, name: string): File {
  return new File([content], name, { type: 'application/gpx+xml' })
}

/** A file whose text() stays pending until `resolve` is called. */
function pendingFile(content: string, name: string) {
  const file = gpxFile(content, name)
  let resolve!: () => void
  const read = new Promise<string>((r) => {
    resolve = () => r(content)
  })
  vi.spyOn(file, 'text').mockReturnValue(read)
  return { file, resolve }
}

function renderApp() {
  const { container } = render(<App />)
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error('file input not found')
  return {
    pick: (...files: File[]) => fireEvent.change(input, { target: { files } }),
    drop: (...files: File[]) =>
      fireEvent.drop(screen.getByTestId('drop-zone'), { dataTransfer: { files } }),
  }
}

async function findSummary() {
  return screen.findByRole('region', { name: 'Loaded track' })
}

function badges(summary: HTMLElement): string[] {
  const list = within(summary).queryByRole('list', { name: 'Available data' })
  return list
    ? within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent ?? '')
    : []
}

describe('App', () => {
  it('renders the app title and the drop zone', () => {
    renderApp()
    expect(screen.getByRole('heading', { name: 'GPX Analyzer' })).toBeInTheDocument()
    expect(screen.getByText('Drop a GPX file here or')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument()
  })

  it('shows the summary for a file chosen with the picker', async () => {
    renderApp().pick(gpxFile(run, 'run.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByRole('heading', { name: 'run.gpx' })).toBeInTheDocument()
    expect(within(summary).getByText('150')).toBeInTheDocument()
    expect(within(summary).getByText('Run fixture')).toBeInTheDocument()
    expect(badges(summary)).toEqual(['Elevation', 'Time', 'Heart rate', 'Cadence'])
  })

  it('shows the track map only after a successful upload', async () => {
    renderApp().pick(gpxFile(run, 'run.gpx'))
    expect(screen.queryByRole('region', { name: 'Track map' })).not.toBeInTheDocument()
    await findSummary()
    expect(screen.getByRole('region', { name: 'Track map' })).toBeInTheDocument()
  })

  it('shows no track map for a bad file', async () => {
    renderApp().pick(gpxFile('hello', 'notes.txt'))
    await screen.findByRole('alert')
    expect(screen.queryByRole('region', { name: 'Track map' })).not.toBeInTheDocument()
  })

  it('shows the summary for a dropped file', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByRole('heading', { name: 'run.gpx' })).toBeInTheDocument()
    expect(within(summary).getByText('150')).toBeInTheDocument()
  })

  it('shows no badges for a track without optional data', async () => {
    renderApp().pick(gpxFile(noEleTime, 'no-ele-time.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByText('80')).toBeInTheDocument()
    expect(badges(summary)).toEqual([])
  })

  it.each([
    { name: 'notes.txt', content: 'hello', message: 'Please choose a .gpx file.' },
    { name: 'empty.gpx', content: '', message: 'This file is empty.' },
    {
      name: 'broken.gpx',
      content: '<gpx',
      message: 'This file is not valid XML. It may be damaged or not a GPX file.',
    },
  ])('shows an alert for $name', async ({ name, content, message }) => {
    renderApp().pick(gpxFile(content, name))
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.queryByRole('region', { name: 'Loaded track' })).not.toBeInTheDocument()
  })

  it('keeps the previous summary when a bad file follows a good one', async () => {
    const app = renderApp()
    app.pick(gpxFile(run, 'run.gpx'))
    await findSummary()
    app.pick(gpxFile('hello', 'notes.txt'))
    expect(await screen.findByRole('alert')).toHaveTextContent('Please choose a .gpx file.')
    expect(screen.getByRole('heading', { name: 'run.gpx' })).toBeInTheDocument()
  })

  it('clears the error when a good file follows a bad one', async () => {
    const app = renderApp()
    app.pick(gpxFile('hello', 'notes.txt'))
    await screen.findByRole('alert')
    app.pick(gpxFile(run, 'run.gpx'))
    await findSummary()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('loads only the first of several dropped files and shows a notice', async () => {
    renderApp().drop(gpxFile(run, 'first.gpx'), gpxFile(noEleTime, 'second.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByRole('heading', { name: 'first.gpx' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Only one file at a time is supported; loaded first.gpx.',
    )
  })

  it('clears the notice on the next single-file load', async () => {
    const app = renderApp()
    app.drop(gpxFile(run, 'first.gpx'), gpxFile(run, 'second.gpx'))
    await findSummary()
    app.pick(gpxFile(noEleTime, 'third.gpx'))
    await screen.findByRole('heading', { name: 'third.gpx' })
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows "Reading file…" while loading', async () => {
    const { file, resolve } = pendingFile(run, 'run.gpx')
    renderApp().pick(file)
    expect(await screen.findByRole('status')).toHaveTextContent('Reading file…')
    resolve()
    await findSummary()
    expect(screen.getByRole('status')).not.toHaveTextContent('Reading file…')
  })

  it('applies only the latest result when loads overlap', async () => {
    const app = renderApp()
    const slow = pendingFile(run, 'slow.gpx')
    app.pick(slow.file)
    app.pick(gpxFile(noEleTime, 'fast.gpx'))
    await screen.findByRole('heading', { name: 'fast.gpx' })

    slow.resolve()
    // Let the stale read settle; it must not replace the newer track.
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByRole('heading', { name: 'fast.gpx' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'slow.gpx' })).not.toBeInTheDocument()
  })

  it('prevents the browser from opening files dropped outside the drop zone', () => {
    renderApp()
    const drop = new Event('drop', { cancelable: true })
    const dragover = new Event('dragover', { cancelable: true })
    window.dispatchEvent(drop)
    window.dispatchEvent(dragover)
    expect(drop.defaultPrevented).toBe(true)
    expect(dragover.defaultPrevented).toBe(true)
  })
})
