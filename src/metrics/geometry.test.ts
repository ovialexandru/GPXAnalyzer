import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import type { Track } from '../model/index.ts'
import { parseGpx } from '../parser/index.ts'
import { getSegmentLines, getTrackBounds } from './index.ts'

function track(text: string): Track {
  const result = parseGpx(text)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.track
}

function expectedBounds(t: Track) {
  const lats = t.points.map((p) => p.lat)
  const lons = t.points.map((p) => p.lon)
  return {
    south: Math.min(...lats),
    west: Math.min(...lons),
    north: Math.max(...lats),
    east: Math.max(...lons),
  }
}

describe('getSegmentLines', () => {
  it('run.gpx: one line of 150 points', () => {
    const t = track(run)
    const lines = getSegmentLines(t)
    expect(lines).toHaveLength(1)
    expect(lines[0]).toHaveLength(150)
    expect(lines[0][0]).toEqual([t.points[0].lat, t.points[0].lon])
  })

  it('bike.gpx: two lines split at segmentStarts[1]', () => {
    const t = track(bike)
    const split = t.segmentStarts[1]
    const lines = getSegmentLines(t)
    expect(lines).toHaveLength(2)
    expect(lines[0].length + lines[1].length).toBe(200)
    expect(lines[0]).toHaveLength(split)
    expect(lines[1][0]).toEqual([t.points[split].lat, t.points[split].lon])
  })

  it('skips empty segments', () => {
    const t: Track = {
      points: [
        { lat: 1, lon: 2 },
        { lat: 3, lon: 4 },
      ],
      segmentStarts: [0, 0, 2],
    }
    expect(getSegmentLines(t)).toEqual([
      [
        [1, 2],
        [3, 4],
      ],
    ])
  })

  it('returns no lines for a track with no points', () => {
    expect(getSegmentLines({ points: [], segmentStarts: [0] })).toEqual([])
  })
})

describe('getTrackBounds', () => {
  it.each([
    ['run.gpx', run],
    ['bike.gpx', bike],
    ['no-ele-time.gpx', noEleTime],
  ])('%s: matches the min/max lat/lon', (_name, text) => {
    const t = track(text)
    expect(getTrackBounds(t)).toEqual(expectedBounds(t))
  })

  it('single-point track: zero-size bounds', () => {
    const t: Track = { points: [{ lat: 45.5, lon: 25.1 }], segmentStarts: [0] }
    expect(getTrackBounds(t)).toEqual({ south: 45.5, west: 25.1, north: 45.5, east: 25.1 })
  })

  it('track with no points: null', () => {
    expect(getTrackBounds({ points: [], segmentStarts: [0] })).toBeNull()
  })
})
