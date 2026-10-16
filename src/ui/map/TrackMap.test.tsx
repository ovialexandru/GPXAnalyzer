import { fireEvent } from '@testing-library/react'
import L from 'leaflet'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import {
  addedControls,
  mouseEventAt,
  project,
  resetLeafletMock,
  type FakeMap,
} from '../../test/leafletMock.ts'
import { renderWithViewStore as render } from '../../test/viewStore.tsx'
import { getTrackBounds, getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { parseGpx } from '../../parser/index.ts'
import { SPEED_COLORS } from '../../settings.ts'
import { formatSpeed } from '../format.ts'
import { UnitsProvider } from '../units/index.ts'
import { gradientPalette } from './speedColors.ts'
import { TrackMap as TrackMapView } from './index.ts'

vi.mock('leaflet', () => import('../../test/leafletMock.ts'))

const metricsCache = new WeakMap<Track, TrackMetrics>()

/** The map with the track's metrics, computed once per track like the app does. */
function TrackMap({ track }: { track: Track }) {
  if (!metricsCache.has(track)) metricsCache.set(track, getTrackMetrics(track))
  return <TrackMapView track={track} metrics={metricsCache.get(track)!} />
}

function track(text: string): Track {
  const result = parseGpx(text)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.track
}

/** The map from the n-th `L.map` call. */
function createdMap(n = 0): FakeMap {
  return vi.mocked(L.map).mock.results[n].value
}

function layerGroup(n: number) {
  return vi.mocked(L.layerGroup).mock.results[n].value
}

function fitArgs(t: Track) {
  const b = getTrackBounds(t)!
  return [
    [
      [b.south, b.west],
      [b.north, b.east],
    ],
    { padding: [24, 24], maxZoom: 16 },
  ]
}

function tooltips(): (string | undefined)[] {
  return vi.mocked(L.circleMarker).mock.results.map((r) => r.value.tooltip)
}

function fitButton(): HTMLButtonElement {
  const button = addedControls[0]?.container.querySelector('button')
  if (!button) throw new Error('fit button not found')
  return button
}

beforeEach(() => {
  resetLeafletMock()
  stubAnimationFrames()
})

describe('TrackMap', () => {
  it('renders the "Track map" region', () => {
    const { getByRole } = render(<TrackMap track={track(run)} />)
    expect(getByRole('region', { name: 'Track map' })).toBeInTheDocument()
  })

  it('creates a canvas map with OSM tiles, a metric scale and the fit control', () => {
    const { getByRole } = render(<TrackMap track={track(run)} />)
    expect(L.map).toHaveBeenCalledTimes(1)
    expect(L.map).toHaveBeenCalledWith(getByRole('region', { name: 'Track map' }), {
      preferCanvas: true,
      dragging: true,
    })
    expect(L.tileLayer).toHaveBeenCalledWith('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: expect.stringContaining('OpenStreetMap'),
    })
    const attribution = vi.mocked(L.tileLayer).mock.calls[0][1]?.attribution
    expect(attribution).toContain('href="https://www.openstreetmap.org/copyright"')
    expect(vi.mocked(L.tileLayer).mock.results[0].value.addTo).toHaveBeenCalledWith(createdMap())
    expect(L.control.scale).toHaveBeenCalledWith({ metric: true, imperial: false })
    expect(addedControls).toHaveLength(1)
    expect(fitButton()).toHaveAccessibleName('Fit to track')
    expect(fitButton()).toHaveAttribute('type', 'button')
    expect(L.DomEvent.disableClickPropagation).toHaveBeenCalledWith(addedControls[0].container)
  })

  it('touch screen (coarse pointer): no one-finger dragging, so the page can scroll', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({ matches: query === '(pointer: coarse)' })),
    )
    try {
      render(<TrackMap track={track(run)} />)
      expect(L.map).toHaveBeenCalledWith(expect.any(HTMLElement), {
        preferCanvas: true,
        dragging: false,
      })
    } finally {
      vi.unstubAllGlobals()
      stubAnimationFrames()
    }
  })

  it('the touch hint is rendered (CSS shows it on touch screens only)', () => {
    const { getByText } = render(<TrackMap track={track(run)} />)
    expect(getByText('Use two fingers to move or zoom the map.')).toBeInTheDocument()
  })

  it('imperial units: an imperial scale bar, swapped back on metric', () => {
    localStorage.setItem('gpx-analyzer.units', 'imperial')
    try {
      const t = track(run)
      const { rerender } = render(
        <UnitsProvider>
          <TrackMap track={t} />
        </UnitsProvider>,
      )
      expect(L.control.scale).toHaveBeenLastCalledWith({ metric: false, imperial: true })
      rerender(<TrackMap track={t} />)
      expect(L.control.scale).toHaveBeenLastCalledWith({ metric: true, imperial: false })
      expect(vi.mocked(L.control.scale).mock.results[0].value.remove).toHaveBeenCalled()
    } finally {
      localStorage.clear()
    }
  })

  it('run.gpx: one polyline, two markers, fitted to the bounds', () => {
    const t = track(run)
    render(<TrackMap track={t} />)
    expect(L.polyline).toHaveBeenCalledTimes(1)
    expect(vi.mocked(L.polyline).mock.calls[0][0]).toHaveLength(150)
    expect(L.circleMarker).toHaveBeenCalledTimes(2)
    expect(L.circleMarker).toHaveBeenNthCalledWith(
      1,
      [t.points[0].lat, t.points[0].lon],
      expect.objectContaining({ fillColor: '#16a34a' }),
    )
    expect(L.circleMarker).toHaveBeenNthCalledWith(
      2,
      [t.points[149].lat, t.points[149].lon],
      expect.objectContaining({ fillColor: '#dc2626' }),
    )
    // Markers after the line so they are drawn above it.
    expect(layerGroup(0).layers).toHaveLength(3)
    expect(layerGroup(0).layers[0]).toBe(vi.mocked(L.polyline).mock.results[0].value)
    expect(layerGroup(0).addTo).toHaveBeenCalledWith(createdMap())
    expect(createdMap().fitBounds).toHaveBeenCalledWith(...fitArgs(t))
  })

  it('bike.gpx: one polyline per segment', () => {
    render(<TrackMap track={track(bike)} />)
    expect(L.polyline).toHaveBeenCalledTimes(2)
  })

  it('start/finish tooltips include the local time when present', () => {
    const t = track(run)
    render(<TrackMap track={t} />)
    expect(tooltips()).toEqual([
      `Start · ${new Date(t.points[0].time!).toLocaleString()}`,
      `Finish · ${new Date(t.points[149].time!).toLocaleString()}`,
    ])
  })

  it('start/finish tooltips without time', () => {
    render(<TrackMap track={track(noEleTime)} />)
    expect(tooltips()).toEqual(['Start', 'Finish'])
  })

  it('swaps the layer group and re-fits on a new track, keeping the same map', () => {
    const first = track(run)
    const second = track(bike)
    const { rerender } = render(<TrackMap track={first} />)
    rerender(<TrackMap track={second} />)

    expect(L.map).toHaveBeenCalledTimes(1)
    expect(layerGroup(0).remove).toHaveBeenCalledTimes(1)
    expect(layerGroup(1).addTo).toHaveBeenCalledWith(createdMap())
    expect(layerGroup(1).remove).not.toHaveBeenCalled()
    expect(createdMap().fitBounds).toHaveBeenCalledTimes(2)
    expect(createdMap().fitBounds).toHaveBeenLastCalledWith(...fitArgs(second))
  })

  it('the fit control re-fits to the current track', () => {
    const second = track(bike)
    const { rerender } = render(<TrackMap track={track(run)} />)
    rerender(<TrackMap track={second} />)
    vi.mocked(createdMap().fitBounds).mockClear()

    fireEvent.click(fitButton())
    expect(createdMap().fitBounds).toHaveBeenCalledTimes(1)
    expect(createdMap().fitBounds).toHaveBeenCalledWith(...fitArgs(second))
  })

  it('the fit control waits for a running zoom animation to end', () => {
    const t = track(run)
    render(<TrackMap track={t} />)
    const map = createdMap()
    vi.mocked(map.fitBounds).mockClear()

    map.emit('zoomstart')
    fireEvent.click(fitButton())
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(map.once).toHaveBeenCalledWith('zoomend', expect.any(Function))

    map.once.mock.calls[0][1]()
    expect(map.fitBounds).toHaveBeenCalledWith(...fitArgs(t))

    map.emit('zoomend')
    fireEvent.click(fitButton())
    expect(map.fitBounds).toHaveBeenCalledTimes(2)
  })

  it('removes the map on unmount', () => {
    const { unmount } = render(<TrackMap track={track(run)} />)
    unmount()
    expect(createdMap().remove).toHaveBeenCalledTimes(1)
  })

  it('StrictMode double mount leaves one live map with the track on it', () => {
    render(<TrackMap track={track(run)} />, { strict: true })
    const maps = vi.mocked(L.map).mock.results.map((r) => r.value)
    expect(maps.length).toBeGreaterThan(1)
    const live = maps.filter((m) => vi.mocked(m.remove).mock.calls.length === 0)
    expect(live).toHaveLength(1)
    const groups = vi.mocked(L.layerGroup).mock.results.map((r) => r.value)
    const shown = groups.filter(
      (g) => g.addTo.mock.calls.length > 0 && g.remove.mock.calls.length === 0,
    )
    expect(shown).toHaveLength(1)
    expect(shown[0].addTo).toHaveBeenCalledWith(live[0])
  })
})

describe('TrackMap hover', () => {
  function hoverMarkers() {
    return vi.mocked(L.marker).mock.results.map((r) => r.value)
  }

  /** Mouse event `dx` px east of a track point. */
  function eastOf(t: Track, index: number, dx: number) {
    const { x, y } = project(t.points[index].lat, t.points[index].lon)
    return mouseEventAt(x + dx, y)
  }

  it('a store hover adds the marker at the point; null removes it', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    expect(L.marker).not.toHaveBeenCalled()

    store.setHover({ index: 30, source: 'elevation' })
    flushFrame()
    expect(L.marker).toHaveBeenCalledTimes(1)
    const [marker] = hoverMarkers()
    expect(marker.latlng).toEqual([t.points[30].lat, t.points[30].lon])
    expect(marker.options).toMatchObject({ interactive: false, keyboard: false })
    expect(marker.addTo).toHaveBeenCalledWith(createdMap())
    const icon = vi.mocked(L.divIcon).mock.calls[0][0]
    expect(icon?.html).toContain('data-hover-marker')
    expect(icon?.iconSize).toEqual([14, 14])

    store.setHover(null)
    flushFrame()
    expect(marker.remove).toHaveBeenCalledTimes(1)
  })

  it('a new index moves the same marker', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    store.setHover({ index: 30, source: 'speed' })
    flushFrame()
    store.setHover({ index: 31, source: 'speed' })
    flushFrame()
    store.setHover(null)
    flushFrame()
    store.setHover({ index: 32, source: 'speed' })
    flushFrame()

    expect(L.marker).toHaveBeenCalledTimes(1)
    const [marker] = hoverMarkers()
    expect(marker.setLatLng).toHaveBeenCalledTimes(2)
    expect(marker.latlng).toEqual([t.points[32].lat, t.points[32].lon])
    expect(marker.addTo).toHaveBeenCalledTimes(2)
  })

  it('a mouse move within 15 px hovers the nearest point; at 20 px it clears', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()

    map.emit('mousemove', eastOf(t, 75, 10))
    expect(store.getState().hover).toBeNull()
    flushFrame()
    expect(store.getState().hover).toEqual({ index: 75, source: 'map' })

    // Points are a few px apart, so go well away from the track: east of the easternmost point.
    const east = t.points.reduce((best, p, i) => (p.lon > t.points[best].lon ? i : best), 0)
    map.emit('mousemove', eastOf(t, east, 20))
    flushFrame()
    expect(store.getState().hover).toBeNull()
  })

  it('handles at most one mouse move per frame, the latest', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()
    map.emit('mousemove', eastOf(t, 10, 0))
    map.emit('mousemove', eastOf(t, 75, 0))
    flushFrame()
    expect(store.getState().hover).toEqual({ index: 75, source: 'map' })
  })

  it('mouseout clears the map hover and drops a pending move', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()
    map.emit('mousemove', eastOf(t, 75, 0))
    flushFrame()
    map.emit('mousemove', eastOf(t, 76, 0))
    map.emit('mouseout')
    flushFrame()
    expect(store.getState().hover).toBeNull()
  })

  it('a tap (click) near the track hovers right away; a tap away clears', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()
    map.emit('click', eastOf(t, 40, 5))
    expect(store.getState().hover).toEqual({ index: 40, source: 'map' })
    map.emit('click', mouseEventAt(0, 0))
    expect(store.getState().hover).toBeNull()
  })

  it('leaving the map or moving away does not clear a chart’s hover', () => {
    const t = track(run)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()
    store.setHover({ index: 5, source: 'elevation' })
    map.emit('mouseout')
    map.emit('click', mouseEventAt(0, 0))
    expect(store.getState().hover).toEqual({ index: 5, source: 'elevation' })
  })

  it('a new track removes the marker and the old handlers', () => {
    const { store, rerender } = render(<TrackMap track={track(run)} />)
    store.setHover({ index: 30, source: 'map' })
    flushFrame()
    rerender(<TrackMap track={track(bike)} />)
    expect(hoverMarkers()[0].remove).toHaveBeenCalled()
    expect(createdMap().handlers.get('mousemove')?.size).toBe(1)
  })
})

describe('TrackMap selection', () => {
  /** Polylines drawn with the selection style. */
  function selectionLines() {
    return vi
      .mocked(L.polyline)
      .mock.results.map((r) => r.value)
      .filter((l) => l.options.className === 'track-selection')
  }

  /** The track's own lines, from the first layer group. */
  function baseLines() {
    return layerGroup(0).layers.filter((l: { setStyle?: unknown }) => l.setStyle)
  }

  /** Layer groups holding selection lines, in creation order. */
  function overlays() {
    return vi
      .mocked(L.layerGroup)
      .mock.results.map((r) => r.value)
      .filter((g) =>
        g.layers.some(
          (l: { options?: { className?: string } }) => l.options?.className === 'track-selection',
        ),
      )
  }

  it('a store selection adds the overlay and dims the base track; clearing restores it', () => {
    const t = track(bike)
    const { store } = render(<TrackMap track={t} />)
    const map = createdMap()
    vi.mocked(map.fitBounds).mockClear()
    expect(selectionLines()).toHaveLength(0)

    store.setSelection([90, 110])
    flushFrame()
    expect(selectionLines()).toHaveLength(2)
    const [overlay] = overlays()
    expect(overlay.addTo).toHaveBeenCalledWith(map)
    expect(baseLines()).toHaveLength(2)
    for (const line of baseLines()) expect(line.options.opacity).toBe(0.35)
    // Markers keep their look.
    for (const marker of vi.mocked(L.circleMarker).mock.results) {
      expect(marker.value.options.fillOpacity).toBe(1)
    }

    store.setSelection(null)
    flushFrame()
    expect(overlay.remove).toHaveBeenCalledTimes(1)
    for (const line of baseLines()) expect(line.options.opacity).toBe(1)
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('a new range swaps the overlay on the same SVG renderer; the base stays dimmed', () => {
    const { store } = render(<TrackMap track={track(run)} />)
    store.setSelection([10, 20])
    flushFrame()
    store.setSelection([10, 40])
    flushFrame()
    const [first, second] = overlays()
    expect(first.remove).toHaveBeenCalledTimes(1)
    expect(second.remove).not.toHaveBeenCalled()
    expect(L.svg).toHaveBeenCalledTimes(1)
    const [a, b] = selectionLines()
    expect(a.options.renderer).toBe(b.options.renderer)
    expect(a.latlngs).toHaveLength(11)
    expect(b.latlngs).toHaveLength(31)
    expect(baseLines()[0].setStyle).toHaveBeenCalledTimes(1)
  })

  it('the map view is never changed by a selection', () => {
    const { store } = render(<TrackMap track={track(run)} />)
    const map = createdMap()
    vi.mocked(map.fitBounds).mockClear()
    store.setSelection([10, 100])
    flushFrame()
    store.setSelection([20, 30])
    flushFrame()
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('a new track (same store) moves the overlay and the dimming to the new lines', () => {
    const { store, rerender } = render(<TrackMap track={track(run)} />)
    store.setSelection([10, 20])
    flushFrame()
    const oldLines = baseLines()
    rerender(<TrackMap track={track(bike)} />)
    // The app gives each track a fresh store; here the same selection is redrawn.
    const [oldOverlay, newOverlay] = overlays()
    expect(oldOverlay.remove).toHaveBeenCalledTimes(1)
    expect(newOverlay.addTo).toHaveBeenCalledWith(createdMap())
    for (const line of oldLines) expect(line.options.opacity).toBe(1)
    const newLines = layerGroup(2).layers.filter((l: { setStyle?: unknown }) => l.setStyle)
    expect(newLines).toHaveLength(2)
    for (const line of newLines) expect(line.options.opacity).toBe(0.35)
  })
})

describe('TrackMap track color', () => {
  afterEach(() => localStorage.clear())

  const palette = gradientPalette(SPEED_COLORS)

  type FakeLine = { setStyle?: unknown; options: { color: string; opacity?: number } }

  /** The track lines (not the markers) of the n-th layer group. */
  function groupLines(n: number): FakeLine[] {
    return layerGroup(n).layers.filter((l: FakeLine) => l.setStyle)
  }

  function lineColors(n: number): string[] {
    return groupLines(n).map((l) => l.options.color)
  }

  it('Plain by default: the toggle shows Plain, one blue line, no legend', () => {
    const { getByRole, queryByRole } = render(<TrackMap track={track(run)} />)
    expect(getByRole('group', { name: 'Track color' })).toBeInTheDocument()
    expect(getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(getByRole('radio', { name: 'Speed' })).toBeEnabled()
    expect(lineColors(0)).toEqual(['#1d4ed8'])
    expect(queryByRole('group', { name: 'Speed colors' })).not.toBeInTheDocument()
  })

  it('Speed swaps in gradient-colored runs without moving the map, and is remembered', () => {
    const { getByRole } = render(<TrackMap track={track(run)} />)
    const map = createdMap()
    vi.mocked(map.fitBounds).mockClear()

    fireEvent.click(getByRole('radio', { name: 'Speed' }))
    expect(getByRole('radio', { name: 'Speed' })).toBeChecked()
    expect(layerGroup(0).remove).toHaveBeenCalledTimes(1)
    expect(layerGroup(1).addTo).toHaveBeenCalledWith(map)
    const colors = lineColors(1)
    expect(colors.length).toBeGreaterThan(10)
    for (const color of colors) expect(palette).toContain(color)
    // run.gpx crosses both thresholds.
    expect(colors).toContain(SPEED_COLORS.colors.slow)
    expect(colors).toContain(SPEED_COLORS.colors.fast)
    // Markers are still drawn above the lines.
    expect(layerGroup(1).layers.at(-1)).toBe(vi.mocked(L.circleMarker).mock.results.at(-1)?.value)
    expect(map.fitBounds).not.toHaveBeenCalled()
    expect(localStorage.getItem('gpx-analyzer.trackColor')).toBe('speed')

    fireEvent.click(getByRole('radio', { name: 'Plain' }))
    expect(layerGroup(1).remove).toHaveBeenCalledTimes(1)
    expect(lineColors(2)).toEqual(['#1d4ed8'])
    expect(localStorage.getItem('gpx-analyzer.trackColor')).toBe('plain')
    expect(map.fitBounds).not.toHaveBeenCalled()
  })

  it('colored runs stay inside segments (bike.gpx has two)', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    const t = track(bike)
    render(<TrackMap track={t} />)
    const lines = vi.mocked(L.polyline).mock.results.map((r) => r.value)
    const points = lines.reduce((sum, l) => sum + (l.latlngs as unknown[]).length, 0)
    // Each run repeats the last point of the run before it, except at the two segment starts.
    expect(points).toBe(t.points.length + lines.length - 2)
  })

  it('the saved choice is restored', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    const { getByRole } = render(<TrackMap track={track(run)} />)
    expect(getByRole('radio', { name: 'Speed' })).toBeChecked()
    expect(lineColors(0).length).toBeGreaterThan(10)
    expect(getByRole('group', { name: 'Speed colors' })).toBeInTheDocument()
  })

  it('no timestamps: Speed is disabled with a hint, Plain is drawn, the choice is kept', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    const { getByRole, getByText, queryByRole, rerender } = render(
      <TrackMap track={track(noEleTime)} />,
    )
    expect(getByRole('radio', { name: 'Speed' })).toBeDisabled()
    expect(getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(getByText('Speed').closest('label')).toHaveAttribute(
      'title',
      "This track has no timestamps, so it can't be colored by speed.",
    )
    expect(lineColors(0)).toEqual(['#1d4ed8'])
    expect(queryByRole('group', { name: 'Speed colors' })).not.toBeInTheDocument()
    expect(localStorage.getItem('gpx-analyzer.trackColor')).toBe('speed')

    rerender(<TrackMap track={track(run)} />)
    expect(getByRole('radio', { name: 'Speed' })).toBeChecked()
    expect(lineColors(1).length).toBeGreaterThan(10)
  })

  it('legend: lower threshold, avg and upper threshold, in the current units', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    localStorage.setItem('gpx-analyzer.units', 'imperial')
    const t = track(run)
    const avg = getTrackMetrics(t).totals.avgSpeed!
    const { getByRole } = render(
      <UnitsProvider>
        <TrackMap track={t} />
      </UnitsProvider>,
    )
    const legend = getByRole('group', { name: 'Speed colors' })
    expect(legend).toHaveTextContent(
      `≤ ${formatSpeed(avg * 0.75, 'imperial')}` +
        `avg ${formatSpeed(avg, 'imperial')}` +
        `≥ ${formatSpeed(avg * 1.25, 'imperial')}`,
    )
    expect(legend).toHaveTextContent(/mph/)
    const bar = legend.querySelector('[aria-hidden="true"]') as HTMLElement
    expect(bar.style.background).toContain('linear-gradient')
  })

  it('Speed mode: the selection is drawn in its speed colors over the dimmed runs', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    const { store } = render(<TrackMap track={track(run)} />)
    store.setSelection([10, 100])
    flushFrame()
    const selection = vi
      .mocked(L.polyline)
      .mock.results.map((r) => r.value)
      .filter((l) => l.options.className === 'track-selection')
    expect(selection.length).toBeGreaterThan(1)
    for (const line of selection) {
      expect(palette).toContain(line.options.color)
      expect(line.options.weight).toBe(5)
    }
    for (const line of groupLines(0)) expect(line.options.opacity).toBe(0.35)
  })

  it('switching mode with a selection redraws it and dims the new lines', () => {
    const { getByRole, store } = render(<TrackMap track={track(run)} />)
    store.setSelection([10, 100])
    flushFrame()
    // Groups so far: the plain track, the orange overlay.
    expect(layerGroup(1).layers[0].options.color).toBe('#ea580c')

    fireEvent.click(getByRole('radio', { name: 'Speed' }))
    // Then: the colored track, the colored overlay.
    expect(layerGroup(1).remove).toHaveBeenCalled()
    expect(layerGroup(3).addTo).toHaveBeenCalledWith(createdMap())
    for (const line of layerGroup(3).layers) expect(palette).toContain(line.options.color)
    for (const line of groupLines(2)) expect(line.options.opacity).toBe(0.35)
    expect(store.getState().selection).toEqual([10, 100])
  })
})
