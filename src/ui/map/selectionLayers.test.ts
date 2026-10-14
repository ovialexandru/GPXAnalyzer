import L from 'leaflet'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { resetLeafletMock } from '../../test/leafletMock.ts'
import { parseTrack } from '../../test/tracks.ts'
import { createSelectionLayers } from './selectionLayers.ts'

vi.mock('leaflet', () => import('../../test/leafletMock.ts'))

function lines() {
  return vi.mocked(L.polyline).mock.calls.map(([latlngs, options]) => ({ latlngs, options }))
}

beforeEach(() => {
  resetLeafletMock()
})

describe('createSelectionLayers', () => {
  it('a range inside one segment: one polyline with exactly those points, ends included', () => {
    const track = parseTrack(run)
    const group = createSelectionLayers(track, [10, 20])
    const [line] = lines()
    expect(lines()).toHaveLength(1)
    expect(line.latlngs).toEqual(track.points.slice(10, 21).map((p) => [p.lat, p.lon]))
    expect(vi.mocked(L.layerGroup).mock.calls[0][0]).toEqual([
      vi.mocked(L.polyline).mock.results[0].value,
    ])
    expect(group).toBe(vi.mocked(L.layerGroup).mock.results[0].value)
  })

  it('an orange, non-interactive line with the track-selection class on an SVG renderer', () => {
    const renderer = L.svg()
    createSelectionLayers(parseTrack(run), [10, 20], renderer)
    expect(lines()[0].options).toEqual({
      color: '#ea580c',
      weight: 5,
      interactive: false,
      className: 'track-selection',
      renderer,
    })
  })

  it('without a renderer, one SVG renderer is shared by the parts', () => {
    createSelectionLayers(parseTrack(bike), [90, 110])
    expect(L.svg).toHaveBeenCalledTimes(1)
    const [a, b] = lines()
    expect(a.options?.renderer).toBe(b.options?.renderer)
  })

  it('a range across bike.gpx’s segment break (index 100): one polyline per segment part', () => {
    const track = parseTrack(bike)
    expect(track.segmentStarts).toEqual([0, 100])
    createSelectionLayers(track, [90, 110])
    expect(lines().map((l) => l.latlngs)).toEqual([
      track.points.slice(90, 100).map((p) => [p.lat, p.lon]),
      track.points.slice(100, 111).map((p) => [p.lat, p.lon]),
    ])
  })

  it('a part with a single point is left out', () => {
    const track = parseTrack(bike)
    createSelectionLayers(track, [90, 100])
    expect(lines()).toHaveLength(1)
    expect(lines()[0].latlngs).toHaveLength(10)
  })

  it('the whole track', () => {
    const track = parseTrack(bike)
    createSelectionLayers(track, [0, 199])
    expect(lines().map((l) => (l.latlngs as unknown[]).length)).toEqual([100, 100])
  })
})
