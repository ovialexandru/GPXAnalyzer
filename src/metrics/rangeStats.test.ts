import type { Track } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { constantSpeedPoints, parseTrack } from '../test/tracks.ts'
import { getRangeStats, getTrackMetrics, type PointRange } from './index.ts'

function statsOf(track: Track, range: PointRange) {
  return getRangeStats(track, getTrackMetrics(track), range)
}

const FIXTURES = [
  ['run.gpx', run],
  ['bike.gpx', bike],
  ['no-ele-time.gpx', noEleTime],
] as const

describe('getRangeStats', () => {
  // Independent reference script (requirements.md, "Reference values").
  it.each([
    ['run.gpx', run, [30, 119], 844.24, 359, 3.0, 8.47, 13.6, 149.78],
    ['bike.gpx', bike, [50, 149], 1141.7, 433, 12.4, 17.18, 33.73, 157.42],
  ] as const)(
    '%s %j: reference values',
    (_n, text, range, distance, duration, gain, avgKmh, maxKmh, bpm) => {
      const s = statsOf(parseTrack(text), [...range])
      expect(Math.abs(s.distance - distance)).toBeLessThanOrEqual(0.5)
      expect(s.duration).toBe(duration)
      expect(s.elevationGain).toBeCloseTo(gain, 1)
      expect(Math.abs(s.avgSpeed! * 3.6 - avgKmh)).toBeLessThanOrEqual(0.01)
      expect(Math.abs(s.maxSpeed! * 3.6 - maxKmh)).toBeLessThanOrEqual(0.01)
      expect(Math.abs(s.avgHeartRate! - bpm)).toBeLessThanOrEqual(0.05)
    },
  )

  it('no-ele-time.gpx [10, 59]: only distance', () => {
    const s = statsOf(parseTrack(noEleTime), [10, 59])
    expect(Math.abs(s.distance - 1152.26)).toBeLessThanOrEqual(0.5)
    expect(s).toMatchObject({
      duration: null,
      elevationGain: null,
      elevationLoss: null,
      movingTime: null,
      avgSpeed: null,
      maxSpeed: null,
      avgHeartRate: null,
    })
  })

  it.each(FIXTURES)('%s: the full range equals the whole-track totals', (_n, text) => {
    const track = parseTrack(text)
    const metrics = getTrackMetrics(track)
    expect(getRangeStats(track, metrics, [0, track.points.length - 1])).toEqual(metrics.totals)
  })

  it.each([
    ['run.gpx', run, 75],
    ['bike.gpx', bike, 100],
    ['bike.gpx', bike, 130],
  ] as const)('%s split at %i: distance, duration and moving time add up', (_n, text, m) => {
    const track = parseTrack(text)
    const metrics = getTrackMetrics(track)
    const last = track.points.length - 1
    const left = getRangeStats(track, metrics, [0, m])
    const right = getRangeStats(track, metrics, [m, last])
    const whole = metrics.totals
    expect(left.distance + right.distance).toBeCloseTo(whole.distance, 9)
    expect(left.duration! + right.duration!).toBe(whole.duration)
    expect(left.movingTime! + right.movingTime!).toBe(whole.movingTime)
    expect(Math.max(left.maxSpeed!, right.maxSpeed!)).toBe(whole.maxSpeed)
  })

  it('a 2-point range', () => {
    const track = { points: constantSpeedPoints(30, 3), segmentStarts: [0] }
    const s = statsOf(track, [10, 11])
    expect(s.distance).toBeCloseTo(3, 6)
    expect(s.duration).toBe(1)
    expect(s.movingTime).toBe(1)
    expect(s.avgSpeed).toBeCloseTo(3, 6)
  })

  it('getRangeStats on 100 000 points takes under 16 ms', () => {
    const points = constantSpeedPoints(100_000, 3).map((p, i) => ({
      ...p,
      ele: i % 50,
      hr: 120 + (i % 40),
    }))
    const track = { points, segmentStarts: [0, 50_000] }
    const metrics = getTrackMetrics(track)
    // Fastest of 10 runs: parallel test workers inflate the mean, never the algorithm's cost.
    let fastest = Infinity
    for (let k = 0; k < 10; k++) {
      const started = performance.now()
      getRangeStats(track, metrics, [k, 99_999 - k])
      fastest = Math.min(fastest, performance.now() - started)
    }
    expect(fastest).toBeLessThan(16)
  })
})
