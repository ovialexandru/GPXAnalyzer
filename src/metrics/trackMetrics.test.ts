import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { constantSpeedPoints, parseTrack } from '../test/tracks.ts'
import { getTrackMetrics } from './index.ts'

describe('getTrackMetrics', () => {
  it.each([
    ['run.gpx', run, 1469.0, 644, 6.0, 3.2],
    ['bike.gpx', bike, 2519.1, 717, 22.4, 17.6],
    ['no-ele-time.gpx', noEleTime, 1721.0, null, null, null],
  ])('%s: series per point and reference totals', (_n, text, distance, duration, gain, loss) => {
    const t = parseTrack(text)
    const m = getTrackMetrics(t)
    for (const series of [m.distance, m.elapsed, m.speed, m.pace]) {
      expect(series).toHaveLength(t.points.length)
    }
    expect(Math.abs(m.totals.distance - distance)).toBeLessThanOrEqual(0.5)
    expect(m.totals.duration).toBe(duration)
    if (gain === null) {
      expect(m.totals.elevationGain).toBeNull()
      expect(m.totals.elevationLoss).toBeNull()
    } else {
      expect(m.totals.elevationGain).toBeCloseTo(gain, 1)
      expect(m.totals.elevationLoss).toBeCloseTo(loss!, 1)
    }
  })

  it('empty track: empty series, distance 0, other totals null', () => {
    expect(getTrackMetrics({ points: [], segmentStarts: [0] })).toEqual({
      distance: [],
      elapsed: [],
      speed: [],
      pace: [],
      totals: { distance: 0, duration: null, elevationGain: null, elevationLoss: null },
    })
  })

  it('computes 100 000 points in under 1 s', () => {
    const points = constantSpeedPoints(100_000, 3).map((p, i) => ({ ...p, ele: i % 50 }))
    const started = performance.now()
    const m = getTrackMetrics({ points, segmentStarts: [0, 50_000] })
    expect(performance.now() - started).toBeLessThan(1000)
    expect(m.speed).toHaveLength(100_000)
  })
})
