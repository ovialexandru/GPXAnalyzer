import { fireEvent } from '@testing-library/react'
import L from 'leaflet'
import type { ReactElement } from 'react'
import { getTrackBounds } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import {
  addedControls,
  mouseEventAt,
  project,
  resetLeafletMock,
  type FakeMap,
} from '../../test/leafletMock.ts'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { ComparisonProvider } from '../compare/ComparisonContext.tsx'
import { getTrackEntries } from '../compare/comparison.ts'
import type { XAxisMode } from '../charts/xAxis.ts'
import { UnitsProvider } from '../units/index.ts'
import { COMPARE_HINT } from './TrackColorToggle.tsx'
import { TrackMap } from './index.ts'

vi.mock('leaflet', () => import('../../test/leafletMock.ts'))

const BLUE = '#1d4ed8'
const ORANGE = '#ea580c'

/** The map for A (and B when given), inside the comparison like the app renders it. */
function mapFor(a: Track, b?: Track, mode: XAxisMode = 'distance'): ReactElement {
  const entries = getTrackEntries([
    { fileName: 'a.gpx', track: a },
    ...(b ? [{ fileName: 'b.gpx', track: b }] : []),
  ])
  return (
    <UnitsProvider>
      <ComparisonProvider entries={entries} chosenMode={mode}>
        <TrackMap track={entries[0].track} metrics={entries[0].metrics} />
      </ComparisonProvider>
    </UnitsProvider>
  )
}

function createdMap(): FakeMap {
  return vi.mocked(L.map).mock.results[0].value
}

function layerGroup(n: number) {
  return vi.mocked(L.layerGroup).mock.results[n].value
}

function polylines() {
  return vi.mocked(L.polyline).mock.results.map((r) => r.value)
}

function hoverMarkers() {
  return vi.mocked(L.marker).mock.results.map((r) => r.value)
}

function at(t: Track, index: number) {
  const { x, y } = project(t.points[index].lat, t.points[index].lon)
  return mouseEventAt(x, y)
}

let a: Track
let b: Track

beforeEach(() => {
  resetLeafletMock()
  stubAnimationFrames()
  a = parseTrack(run)
  b = parseTrack(runB)
})

describe('TrackMap: two tracks', () => {
  it('draws B, then A on top, in their colors, then all four start/finish markers', () => {
    renderWithViewStore(mapFor(a, b))
    const [lineA, lineB] = polylines()
    expect(lineB.options.color).toBe(ORANGE)
    expect(lineB.latlngs).toHaveLength(130)
    expect(lineA.options.color).toBe(BLUE)
    expect(lineA.latlngs).toHaveLength(150)
    expect(lineA.options.weight).toBe(lineB.options.weight)
    const layers = layerGroup(0).layers
    expect(layers.slice(0, 2)).toEqual([lineB, lineA])
    expect(layers.slice(2)).toEqual(vi.mocked(L.circleMarker).mock.results.map((r) => r.value))
    expect(layers).toHaveLength(6)
  })

  it('fits both tracks, on load and from the fit control', () => {
    const wide: Track = {
      ...b,
      points: b.points.map((p) => ({ ...p, lat: p.lat + 0.01, lon: p.lon + 0.02 })),
    }
    renderWithViewStore(mapFor(a, wide))
    const ba = getTrackBounds(a)!
    const bb = getTrackBounds(wide)!
    const union = [
      [Math.min(ba.south, bb.south), Math.min(ba.west, bb.west)],
      [Math.max(ba.north, bb.north), Math.max(ba.east, bb.east)],
    ]
    expect(createdMap().fitBounds).toHaveBeenLastCalledWith(union, expect.anything())
    createdMap().fitBounds.mockClear()
    fireEvent.click(addedControls[0].container.querySelector('button')!)
    expect(createdMap().fitBounds).toHaveBeenCalledWith(union, expect.anything())
  })

  it('refits to A alone when B is removed, and redraws the plain track', () => {
    const { rerender } = renderWithViewStore(mapFor(a, b))
    createdMap().fitBounds.mockClear()
    rerender(mapFor(a))
    const ba = getTrackBounds(a)!
    expect(createdMap().fitBounds).toHaveBeenCalledWith(
      [
        [ba.south, ba.west],
        [ba.north, ba.east],
      ],
      expect.anything(),
    )
    expect(layerGroup(0).remove).toHaveBeenCalled()
    expect(polylines().at(-1).options.color).toBe(BLUE)
  })

  it('hovering B on the map moves a marker on each track, in its color', () => {
    const { store } = renderWithViewStore(mapFor(a, b))
    createdMap().emit('mousemove', at(b, 60))
    flushFrame()
    expect(store.getState().hover).toEqual({ index: 60, source: 'map', track: 'b' })
    flushFrame()
    const [markerA, markerB] = hoverMarkers()
    expect(markerB.latlng).toEqual([b.points[60].lat, b.points[60].lon])
    // A's marker is at the same distance from its start: near its own point 60.
    const nearA = a.points.slice(58, 63).map((p) => [p.lat, p.lon])
    expect(nearA).toContainEqual(markerA.latlng)
    const html = vi.mocked(L.divIcon).mock.calls.map((c) => c[0]?.html)
    expect(html[0]).toContain(`background: ${BLUE}`)
    expect(html[1]).toContain(`background: ${ORANGE}`)
  })

  it('the closer track wins a map hover', () => {
    const { store } = renderWithViewStore(mapFor(a, b))
    createdMap().emit('mousemove', at(a, 60))
    flushFrame()
    expect(store.getState().hover).toEqual({ index: 60, source: 'map' })
  })

  it('a hover past the end of B shows only A’s marker', () => {
    const { store } = renderWithViewStore(mapFor(a, b))
    store.setHover({ index: 145, source: 'speed' })
    flushFrame()
    expect(hoverMarkers()).toHaveLength(1)
    expect(hoverMarkers()[0].latlng).toEqual([a.points[145].lat, a.points[145].lon])

    store.setHover({ index: 40, source: 'speed' })
    flushFrame()
    expect(hoverMarkers()).toHaveLength(2)
    expect(hoverMarkers()[1].addTo).toHaveBeenCalledWith(createdMap())
  })

  it('a selection highlights each track’s own range in its color over both dimmed tracks', () => {
    const { store } = renderWithViewStore(mapFor(a, b))
    store.setSelection([20, 140])
    flushFrame()
    const highlights = polylines().filter((l) => l.options.className === 'track-selection')
    expect(highlights.map((l) => l.options.color)).toEqual([BLUE, ORANGE])
    expect(highlights[0].latlngs).toHaveLength(121)
    // B ends at its point 129.
    expect(highlights[1].latlngs.at(-1)).toEqual([b.points[129].lat, b.points[129].lon])
    for (const line of layerGroup(0).layers.slice(0, 2)) expect(line.options.opacity).toBe(0.35)

    store.setSelection(null)
    flushFrame()
    for (const line of layerGroup(0).layers.slice(0, 2)) expect(line.options.opacity).toBe(1)
  })

  it('a selection past the end of B highlights only A', () => {
    const { store } = renderWithViewStore(mapFor(a, b))
    store.setSelection([135, 149])
    flushFrame()
    const highlights = polylines().filter((l) => l.options.className === 'track-selection')
    expect(highlights.map((l) => l.options.color)).toEqual([BLUE])
  })

  it('Speed is disabled with the compare hint, and comes back with one track', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'speed')
    const { getByRole, queryByRole, rerender } = renderWithViewStore(mapFor(a, b))
    const speed = getByRole('radio', { name: 'Speed' })
    expect(speed).toBeDisabled()
    expect(speed.closest('label')).toHaveAttribute('title', COMPARE_HINT)
    expect(getByRole('radio', { name: 'Plain' })).toBeChecked()
    expect(queryByRole('group', { name: 'Speed colors' })).not.toBeInTheDocument()
    expect(localStorage.getItem('gpx-analyzer.trackColor')).toBe('speed')

    rerender(mapFor(a))
    expect(getByRole('radio', { name: 'Speed' })).toBeChecked()
    expect(getByRole('group', { name: 'Speed colors' })).toBeInTheDocument()
  })

  it('time axis with an untimed B: hover markers only where a track has the position', () => {
    const untimed = parseTrack(noEleTime)
    const { store } = renderWithViewStore(mapFor(a, untimed, 'time'))
    // B has no time, so the comparison uses distance: both tracks get markers.
    store.setHover({ index: 10, source: 'speed' })
    flushFrame()
    expect(hoverMarkers()).toHaveLength(2)
  })
})
