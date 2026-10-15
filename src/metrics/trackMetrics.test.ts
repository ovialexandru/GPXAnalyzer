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
      settleIgnored: [],
      totals: {
        distance: 0,
        duration: null,
        elevationGain: null,
        elevationLoss: null,
        movingTime: null,
        avgSpeed: null,
        maxSpeed: null,
        avgHeartRate: null,
      },
    })
  })

  it.each([
    ['run.gpx', run, 644, 8.21, 13.6, 143.82],
    ['bike.gpx', bike, 517, 17.48, 33.73, 155.95],
  ])('%s: moving time, avg/max speed and avg HR', (_n, text, time, avgKmh, maxKmh, bpm) => {
    const { totals } = getTrackMetrics(parseTrack(text))
    expect(totals.movingTime).toBe(time)
    expect(Math.abs(totals.avgSpeed! * 3.6 - avgKmh)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(totals.maxSpeed! * 3.6 - maxKmh)).toBeLessThanOrEqual(0.01)
    expect(Math.abs(totals.avgHeartRate! - bpm)).toBeLessThanOrEqual(0.05)
  })

  it('no-ele-time.gpx: no moving stats, speeds or HR', () => {
    const { totals } = getTrackMetrics(parseTrack(noEleTime))
    expect(totals).toMatchObject({
      movingTime: null,
      avgSpeed: null,
      maxSpeed: null,
      avgHeartRate: null,
    })
  })

  it('never moving: moving time 0, avg speed null, max speed 0', () => {
    const points = constantSpeedPoints(10, 0)
    const { totals } = getTrackMetrics({ points, segmentStarts: [0] })
    expect(totals).toMatchObject({ movingTime: 0, avgSpeed: null, maxSpeed: 0 })
  })

  it('max speed is the largest smoothed speed', () => {
    const m = getTrackMetrics(parseTrack(bike))
    const max = Math.max(...m.speed.filter((v): v is number => v !== null))
    expect(m.totals.maxSpeed).toBe(max)
  })

  it('computes 100 000 points in under 1 s', () => {
    const points = constantSpeedPoints(100_000, 3).map((p, i) => ({
      ...p,
      ele: i % 50,
      hr: 120 + (i % 40),
    }))
    const started = performance.now()
    const m = getTrackMetrics({ points, segmentStarts: [0, 50_000] })
    expect(performance.now() - started).toBeLessThan(1000)
    expect(m.speed).toHaveLength(100_000)
  })

  it('computes 100 000 points with a recording gap every 30 s in under 1 s', () => {
    // A 15 s gap after every 30 points: ~3 300 settle windows for max speed.
    const points = constantSpeedPoints(100_000, 3).map((p, i) => ({
      ...p,
      time: p.time! + Math.floor(i / 30) * 15_000,
      hr: 120 + (i % 40),
    }))
    const started = performance.now()
    const m = getTrackMetrics({ points, segmentStarts: [0] })
    expect(performance.now() - started).toBeLessThan(1000)
    expect(m.totals.maxSpeed).toBeCloseTo(3, 6)
  })
})
