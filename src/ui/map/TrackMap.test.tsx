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
import { getTrackBounds } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { parseGpx } from '../../parser/index.ts'
import { TrackMap } from './index.ts'

vi.mock('leaflet', () => import('../../test/leafletMock.ts'))

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
