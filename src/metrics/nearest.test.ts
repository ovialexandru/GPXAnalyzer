import type { Track, TrackPoint } from '../model/index.ts'
import { linePoints, METERS_PER_DEG_LAT } from '../test/tracks.ts'
import { createNearestPointFinder } from './nearest.ts'

function trackOf(points: TrackPoint[], segmentStarts = [0]): Track {
  return { points, segmentStarts }
}

describe('createNearestPointFinder', () => {
  const line = trackOf(linePoints([0, 100, 200, 300]))
  const find = createNearestPointFinder(line)

  it('an exact point gives its index', () => {
    line.points.forEach((p, i) => expect(find(p.lat, p.lon)).toBe(i))
  })

  it('a spot between two points gives the closer one', () => {
    expect(find(140 / METERS_PER_DEG_LAT, 0)).toBe(1)
    expect(find(160 / METERS_PER_DEG_LAT, 0)).toBe(2)
    expect(find(130 / METERS_PER_DEG_LAT, 0.0005)).toBe(1)
  })

  it('spots beyond the ends give the end points', () => {
    expect(find(-1, 0)).toBe(0)
    expect(find(1, 0)).toBe(3)
  })

  it('scales longitude far from the equator: 100 m east beats 150 m north', () => {
    const lat = 60
    const metersPerDegLon = METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)
    const east: TrackPoint = { lat, lon: 10 + 100 / metersPerDegLon }
    const north: TrackPoint = { lat: lat + 150 / METERS_PER_DEG_LAT, lon: 10 }
    const finder = createNearestPointFinder(trackOf([north, east]))
    expect(finder(lat, 10)).toBe(1)
  })

  it('an empty track gives null', () => {
    expect(createNearestPointFinder(trackOf([], []))(0, 0)).toBeNull()
  })

  it('indices are global across segments', () => {
    const t = trackOf(linePoints([0, 10, 20, 1000, 1010, 1020]), [0, 3])
    expect(createNearestPointFinder(t)(1012 / METERS_PER_DEG_LAT, 0)).toBe(4)
  })

  it('100 000 points: 1 000 lookups in under 1 s', () => {
    const points = Array.from({ length: 100_000 }, (_, i): TrackPoint => ({
      lat: 45 + Math.sin(i / 500) * 0.05,
      lon: 7 + i * 1e-5,
    }))
    const finder = createNearestPointFinder(trackOf(points))
    const start = performance.now()
    for (let i = 0; i < 1000; i++) finder(45 + (i % 10) * 0.005, 7 + i * 1e-3)
    expect(performance.now() - start).toBeLessThan(1000)
  })
})
