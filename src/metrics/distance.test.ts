import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { linePoints, parseTrack } from '../test/tracks.ts'
import { getCumulativeDistance, haversineDistance } from './index.ts'

describe('haversineDistance', () => {
  it('is 0 for the same point', () => {
    expect(haversineDistance({ lat: 45.5, lon: 25.1 }, { lat: 45.5, lon: 25.1 })).toBe(0)
  })

  // R = 6 371 008.8 m gives 111 195.08 m (111 194.9 m would be R = 6 371 000 m).
  it('1° of latitude on the equator is 111 195.1 m', () => {
    const d = haversineDistance({ lat: 0, lon: 0 }, { lat: 1, lon: 0 })
    expect(Math.abs(d - 111_195.1)).toBeLessThanOrEqual(0.1)
  })

  it('is symmetric', () => {
    const a = { lat: 45.52, lon: 25.31 }
    const b = { lat: 45.58, lon: 25.12 }
    expect(haversineDistance(a, b)).toBe(haversineDistance(b, a))
  })
})

describe('getCumulativeDistance', () => {
  it.each([
    ['run.gpx', run, 1469.0],
    ['bike.gpx', bike, 2519.1],
    ['no-ele-time.gpx', noEleTime, 1721.0],
  ])('%s: one entry per point, starts at 0, never decreases, totals %f m', (_n, text, total) => {
    const t = parseTrack(text)
    const d = getCumulativeDistance(t)
    expect(d).toHaveLength(t.points.length)
    expect(d[0]).toBe(0)
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThanOrEqual(d[i - 1])
    expect(Math.abs(d.at(-1)! - total)).toBeLessThanOrEqual(0.5)
  })

  it('does not count the gap between segments', () => {
    const points = linePoints([0, 10, 20, 1000, 1010])
    const d = getCumulativeDistance({ points, segmentStarts: [0, 3] })
    expect(d[3]).toBe(d[2])
    expect(d[2]).toBeCloseTo(20, 6)
    expect(d[4]).toBeCloseTo(30, 6)
  })

  it('bike.gpx: the second segment starts at the first segment total', () => {
    const t = parseTrack(bike)
    const d = getCumulativeDistance(t)
    const split = t.segmentStarts[1]
    expect(d[split]).toBe(d[split - 1])
  })

  it('returns [] for a track with no points', () => {
    expect(getCumulativeDistance({ points: [], segmentStarts: [0] })).toEqual([])
  })
})
