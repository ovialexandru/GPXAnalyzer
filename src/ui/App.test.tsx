import { fireEvent, render, screen, within } from '@testing-library/react'
import L from 'leaflet'
import { Profiler } from 'react'
import { flushFrame, stubAnimationFrames } from '../test/animationFrames.ts'
import { liveCharts, resetEChartsMock } from '../test/echartsMock.ts'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { mouseEventAt, project, resetLeafletMock, type FakeMap } from '../test/leafletMock.ts'
import { parseTrack } from '../test/tracks.ts'
import App from './App.tsx'

// jsdom has no layout or canvas; TrackMap's and the charts' own tests cover the library calls.
vi.mock('leaflet', () => import('../test/leafletMock.ts'))
vi.mock('echarts/core', () => import('../test/echartsMock.ts'))

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

/** The summary's `dt`/`dd` pairs as label → value. */
function details(summary: HTMLElement): Record<string, string> {
  const entries = [...summary.querySelectorAll('dt')].map((dt) => [
    dt.textContent ?? '',
    dt.nextElementSibling?.textContent ?? '',
  ])
  return Object.fromEntries(entries)
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
    expect(within(summary).getByRole('heading', { name: 'Run fixture' })).toBeInTheDocument()
    expect(within(summary).getByText('run.gpx')).toBeInTheDocument()
    expect(badges(summary)).toEqual(['Elevation', 'Time', 'Heart rate', 'Cadence'])
  })

  it('uses the file name as the heading when the track has no name', async () => {
    renderApp().pick(gpxFile(run.replace(/<name>[^<]*<\/name>/g, ''), 'unnamed.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByRole('heading', { name: 'unnamed.gpx' })).toBeInTheDocument()
    expect(within(summary).getAllByText('unnamed.gpx')).toHaveLength(1)
  })

  it('shows the whole-track stats in order', async () => {
    renderApp().pick(gpxFile(run, 'run.gpx'))
    const summary = await findSummary()
    expect(Object.entries(details(summary))).toEqual([
      ['Distance', '1.47 km'],
      ['Duration', '10:44'],
      ['Elevation gain', '6 m'],
      ['Avg speed', '8.2 km/h'],
      ['Max speed', '13.6 km/h'],
      ['Avg HR', '144 bpm'],
      ['Max HR', '159 bpm'],
      ['Avg cadence', '69 rpm'],
      ['Max cadence', '79 rpm'],
    ])
  })

  it('shows only the distance for a track without time or elevation', async () => {
    renderApp().pick(gpxFile(noEleTime, 'no-ele-time.gpx'))
    const summary = await findSummary()
    expect(details(summary)).toEqual({ Distance: '1.72 km' })
  })

  it('shows the track map only after a successful upload', async () => {
    renderApp().pick(gpxFile(run, 'run.gpx'))
    expect(screen.queryByRole('region', { name: 'Track map' })).not.toBeInTheDocument()
    await findSummary()
    expect(screen.getByRole('region', { name: 'Track map' })).toBeInTheDocument()
  })

  it('shows the x-axis toggle and both charts only after a successful upload', async () => {
    renderApp().pick(gpxFile(run, 'run.gpx'))
    expect(screen.queryByRole('region', { name: 'Elevation chart' })).not.toBeInTheDocument()
    await findSummary()
    expect(screen.getByRole('group', { name: 'X axis' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Elevation chart' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Speed chart' })).toBeInTheDocument()
  })

  it('shows no charts for a bad file', async () => {
    renderApp().pick(gpxFile('hello', 'notes.txt'))
    await screen.findByRole('alert')
    expect(screen.queryByRole('region', { name: 'Elevation chart' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Speed chart' })).not.toBeInTheDocument()
  })

  it('shows no track map for a bad file', async () => {
    renderApp().pick(gpxFile('hello', 'notes.txt'))
    await screen.findByRole('alert')
    expect(screen.queryByRole('region', { name: 'Track map' })).not.toBeInTheDocument()
  })

  it('shows the summary for a dropped file', async () => {
    renderApp().drop(gpxFile(run, 'run.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByRole('heading', { name: 'Run fixture' })).toBeInTheDocument()
    expect(within(summary).getByText('run.gpx')).toBeInTheDocument()
  })

  it('shows no badges for a track without optional data', async () => {
    renderApp().pick(gpxFile(noEleTime, 'no-ele-time.gpx'))
    const summary = await findSummary()
    expect(within(summary).getByText('no-ele-time.gpx')).toBeInTheDocument()
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
    expect(screen.getByText('run.gpx')).toBeInTheDocument()
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
    expect(within(summary).getByText('first.gpx')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Only one file at a time is supported; loaded first.gpx.',
    )
  })

  it('clears the notice on the next single-file load', async () => {
    const app = renderApp()
    app.drop(gpxFile(run, 'first.gpx'), gpxFile(run, 'second.gpx'))
    await findSummary()
    app.pick(gpxFile(noEleTime, 'third.gpx'))
    await screen.findByText('third.gpx')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows "Reading <name>…" and disables the drop zone and sample while loading', async () => {
    const { file, resolve } = pendingFile(run, 'run.gpx')
    renderApp().pick(file)
    expect(await screen.findByRole('status')).toHaveTextContent('Reading run.gpx…')
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Try a sample track' })).toBeDisabled()
    resolve()
    await findSummary()
    expect(screen.getByRole('status')).not.toHaveTextContent('Reading')
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeEnabled()
  })

  describe('empty, error and loaded states', () => {
    // Not vi.unstubAllGlobals: that would also drop the ECharts mock's ResizeObserver stub.
    afterEach(() => vi.mocked(fetch).mockRestore?.())

    it('before any file: the intro with the privacy note and the sample button', () => {
      renderApp()
      const intro = screen.getByRole('region', { name: 'Getting started' })
      expect(intro).toHaveTextContent('never uploaded')
      expect(screen.getByText('Drop a GPX file here or')).toBeInTheDocument()
    })

    it('"Try a sample track" loads the bundled sample from the same origin', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(run))
      renderApp()
      fireEvent.click(screen.getByRole('button', { name: 'Try a sample track' }))
      const summary = await findSummary()
      expect(fetchMock).toHaveBeenCalledWith('/sample.gpx')
      expect(within(summary).getByText('sample.gpx')).toBeInTheDocument()
      // Loaded: the intro goes and the drop zone is the compact row.
      expect(screen.queryByRole('region', { name: 'Getting started' })).not.toBeInTheDocument()
      expect(screen.getByText('Drop another GPX file here or')).toBeInTheDocument()
    })

    it('a sample that fails to load shows an error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 404 }))
      renderApp()
      fireEvent.click(screen.getByRole('button', { name: 'Try a sample track' }))
      expect(await screen.findByRole('alert')).toHaveTextContent(
        "Couldn't open sample.gpxThe sample track could not be loaded.",
      )
    })

    it('the error names the file; Dismiss removes it and keeps the loaded track', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      app.pick(gpxFile('<gpx', 'bad.gpx'))
      const alert = await screen.findByRole('alert')
      expect(within(alert).getByText("Couldn't open bad.gpx")).toBeInTheDocument()
      fireEvent.click(within(alert).getByRole('button', { name: 'Dismiss' }))
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.getByRole('region', { name: 'Loaded track' })).toBeInTheDocument()
    })
  })

  describe('units', () => {
    beforeEach(() => localStorage.clear())
    afterEach(() => localStorage.clear())

    function unitsRadio(name: 'Metric' | 'Imperial') {
      return within(screen.getByRole('group', { name: 'Units' })).getByRole('radio', { name })
    }

    it('the header switch defaults to Metric before any file', () => {
      renderApp()
      expect(unitsRadio('Metric')).toBeChecked()
    })

    it('Imperial changes the summary and is remembered', async () => {
      renderApp().pick(gpxFile(run, 'run.gpx'))
      const summary = await findSummary()
      fireEvent.click(unitsRadio('Imperial'))
      expect(details(summary)).toMatchObject({
        Distance: '0.91 mi',
        'Elevation gain': '20 ft',
        'Avg speed': '5.1 mph',
        'Max speed': '8.5 mph',
        'Avg HR': '144 bpm',
      })
      expect(localStorage.getItem('gpx-analyzer.units')).toBe('imperial')
    })

    it('a remembered Imperial choice applies on the next visit', async () => {
      localStorage.setItem('gpx-analyzer.units', 'imperial')
      renderApp().pick(gpxFile(run, 'run.gpx'))
      const summary = await findSummary()
      expect(unitsRadio('Imperial')).toBeChecked()
      expect(details(summary).Distance).toBe('0.91 mi')
    })
  })

  it('applies only the latest result when loads overlap', async () => {
    const app = renderApp()
    const slow = pendingFile(run, 'slow.gpx')
    app.pick(slow.file)
    app.pick(gpxFile(noEleTime, 'fast.gpx'))
    await screen.findByText('fast.gpx')

    slow.resolve()
    // Let the stale read settle; it must not replace the newer track.
    await new Promise((r) => setTimeout(r, 0))
    expect(screen.getByText('fast.gpx')).toBeInTheDocument()
    expect(screen.queryByText('slow.gpx')).not.toBeInTheDocument()
  })

  describe('hover linking', () => {
    beforeEach(() => {
      resetEChartsMock()
      resetLeafletMock()
      stubAnimationFrames()
    })

    function liveMap(): FakeMap {
      return vi.mocked(L.map).mock.results.at(-1)!.value
    }

    function hoverMarkers() {
      return vi.mocked(L.marker).mock.results.map((r) => r.value)
    }

    it('links chart → map and map → charts without re-rendering any component', async () => {
      const onRender = vi.fn()
      const { container } = render(
        <Profiler id="app" onRender={onRender}>
          <App />
        </Profiler>,
      )
      const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
      fireEvent.change(input, { target: { files: [gpxFile(run, 'run.gpx')] } })
      await findSummary()
      const commits = onRender.mock.calls.length
      const [elevation, speed] = liveCharts()

      elevation.emit('updateAxisPointer', { axesInfo: [{ axisDim: 'x', value: 0.5 }] })
      flushFrame()
      expect(hoverMarkers()).toHaveLength(1)
      expect(hoverMarkers()[0].addTo).toHaveBeenCalledWith(liveMap())
      expect(speed.dispatchAction).toHaveBeenCalled()

      elevation.emit('globalout')
      flushFrame()
      expect(hoverMarkers()[0].remove).toHaveBeenCalled()

      const p = parseTrack(run).points[100]
      const { x, y } = project(p.lat, p.lon)
      elevation.dispatchAction.mockClear()
      liveMap().emit('mousemove', mouseEventAt(x, y))
      flushFrame() // the map handles the move
      flushFrame() // the store notifies
      expect(hoverMarkers()[0].setLatLng).toHaveBeenCalledWith([p.lat, p.lon])
      expect(elevation.dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({ tooltipOption: { showContent: false } }),
        { silent: true },
      )

      expect(onRender).toHaveBeenCalledTimes(commits)
    })

    it('a new file clears the hover', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      liveCharts()[0].emit('updateAxisPointer', { axesInfo: [{ axisDim: 'x', value: 0.5 }] })
      flushFrame()
      const marker = hoverMarkers()[0]

      app.pick(gpxFile(noEleTime, 'second.gpx'))
      await screen.findByText('second.gpx')
      expect(marker.remove).toHaveBeenCalled()
      expect(vi.mocked(L.map)).toHaveBeenCalledTimes(1)
    })
  })

  describe('chart zoom', () => {
    beforeEach(() => {
      resetEChartsMock()
      resetLeafletMock()
      stubAnimationFrames()
    })

    function resetButton() {
      return screen.getByRole('button', { name: 'Reset zoom' })
    }

    function wheelZoom(start: number, end: number) {
      liveCharts()[0].emit('datazoom', { batch: [{ start, end }] })
      flushFrame()
    }

    it('zooming in enables Reset; zooming all the way out disables it', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      expect(resetButton()).toBeDisabled()

      wheelZoom(20, 50)
      expect(resetButton()).toBeEnabled()
      wheelZoom(0, 100)
      expect(resetButton()).toBeDisabled()
    })

    it('a new file resets the zoom', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      wheelZoom(20, 50)
      expect(resetButton()).toBeEnabled()

      app.pick(gpxFile(run, 'second.gpx'))
      await screen.findByText('second.gpx')
      expect(resetButton()).toBeDisabled()
    })
  })

  describe('range selection', () => {
    beforeEach(() => {
      resetEChartsMock()
      resetLeafletMock()
      stubAnimationFrames()
    })

    function clearButton() {
      return screen.getByRole('button', { name: 'Clear selection' })
    }

    /** Polylines drawn as the map's selection highlight. */
    function highlights() {
      return vi
        .mocked(L.polyline)
        .mock.results.filter((r) => r.value.options.className === 'track-selection')
    }

    function brush(x0: number, x1: number) {
      liveCharts()[0].emit('brush', { areas: [{ coordRange: [x0, x1] }] })
      flushFrame()
    }

    it('brushing a chart highlights the stretch on the map and enables Clear', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      expect(clearButton()).toBeDisabled()

      brush(0.3, 0.6)
      expect(clearButton()).toBeEnabled()
      expect(highlights()).toHaveLength(1)
      expect(liveCharts()[1].dispatchAction).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'brush', areas: [expect.anything()] }),
        { silent: true },
      )

      fireEvent.click(clearButton())
      flushFrame()
      expect(clearButton()).toBeDisabled()
    })

    it('brushing switches the summary to the selection stats', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      const summary = await findSummary()
      /** "290 m" or "1.47 km" in meters. */
      const meters = (text: string) => parseFloat(text) * (text.endsWith(' km') ? 1000 : 1)
      const whole = meters(details(summary).Distance)

      brush(0.3, 0.6)
      expect(within(summary).getByText(/^Selection ·/)).toBeInTheDocument()
      expect(summary.querySelector('dl')).toHaveAccessibleName('Selection stats')
      expect(meters(details(summary).Distance)).toBeLessThan(whole)

      fireEvent.click(within(summary).getByRole('button', { name: 'Show whole track' }))
      flushFrame()
      expect(summary.querySelector('dl')).toHaveAccessibleName('Whole-track stats')
      expect(details(summary).Distance).toBe('1.47 km')
    })

    it('a new file clears the selection; a bad file keeps it', async () => {
      const app = renderApp()
      app.pick(gpxFile(run, 'run.gpx'))
      await findSummary()
      brush(0.3, 0.6)

      app.pick(gpxFile('<gpx', 'bad.gpx'))
      await screen.findByRole('alert')
      expect(clearButton()).toBeEnabled()

      app.pick(gpxFile(run, 'second.gpx'))
      await screen.findByText('second.gpx')
      expect(clearButton()).toBeDisabled()
    })
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
