import { getTrackMetrics } from '../../metrics/index.ts'
import type { Track, TrackPoint } from '../../model/index.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { constantSpeedPoints, linePoints, parseTrack } from '../../test/tracks.ts'
import type { XAxisMode } from '../charts/xAxis.ts'
import {
  alignedPoint,
  alignedRange,
  axisEnd,
  buildAxisLine,
  rangeOwner,
  type AxisTrack,
} from './alignment.ts'

function axisTrack(track: Track, mode: XAxisMode = 'distance'): AxisTrack {
  const metrics = getTrackMetrics(track)
  return { metrics, line: buildAxisLine(track, metrics, mode) }
}

function trackOf(points: TrackPoint[], segmentStarts = [0]): Track {
  return { points, segmentStarts }
}

describe('buildAxisLine / axisEnd', () => {
  it('x values only: km on distance, elapsed s on time', () => {
    const track = trackOf(linePoints([0, 500, 1000], [0, 100, 200]))
    const metrics = getTrackMetrics(track)
    const distance = buildAxisLine(track, metrics, 'distance')
    const xs = distance.data.map(([x]) => x)
    ;[0, 0.5, 1].forEach((x, i) => expect(xs[i]).toBeCloseTo(x, 6))
    expect(distance.data.every(([, y]) => y === null)).toBe(true)
    expect(axisEnd(distance)).toBeCloseTo(1, 6)
    expect(axisEnd(buildAxisLine(track, metrics, 'time'))).toBe(200)
  })

  it('no point on the time axis without timestamps', () => {
    expect(axisEnd(axisTrack(parseTrack(noEleTime), 'time').line)).toBeNull()
  })
})

describe('alignedPoint', () => {
  it('is the identity for the same track', () => {
    const a = axisTrack(parseTrack(run))
    for (const i of [0, 1, 50, 149]) expect(alignedPoint(a, i, a, 'distance')).toBe(i)
    const t = axisTrack(parseTrack(run), 'time')
    for (const i of [0, 77, 149]) expect(alignedPoint(t, i, t, 'time')).toBe(i)
  })

  it('finds the point at the same distance; nothing past the end of the shorter track', () => {
    const a = axisTrack(trackOf(linePoints([0, 100, 200, 300, 400])))
    const b = axisTrack(trackOf(linePoints([0, 90, 210])))
    expect(alignedPoint(a, 1, b, 'distance')).toBe(1)
    expect(alignedPoint(a, 2, b, 'distance')).toBe(2)
    expect(alignedPoint(a, 3, b, 'distance')).toBeNull()
    expect(alignedPoint(b, 2, a, 'distance')).toBe(2)
  })

  it('same elapsed time on the time axis', () => {
    const a = axisTrack(trackOf(constantSpeedPoints(11, 3)), 'time')
    const slow = axisTrack(trackOf(linePoints([0, 10, 20], [0, 5, 10])), 'time')
    expect(alignedPoint(a, 5, slow, 'time')).toBe(1)
    expect(alignedPoint(slow, 2, a, 'time')).toBe(10)
  })

  it('null on the time axis when either track has no timestamps', () => {
    const timed = axisTrack(parseTrack(run), 'time')
    const untimed = axisTrack(parseTrack(noEleTime), 'time')
    expect(alignedPoint(timed, 10, untimed, 'time')).toBeNull()
    expect(alignedPoint(untimed, 10, timed, 'time')).toBeNull()
  })

  it('run-b (shorter): aligned while it lasts, then nothing', () => {
    const a = axisTrack(parseTrack(run))
    const b = axisTrack(parseTrack(runB))
    // B is A's route moved 3 m north, so the same index is at almost the same distance.
    expect(Math.abs(alignedPoint(a, 60, b, 'distance')! - 60)).toBeLessThanOrEqual(1)
    expect(alignedPoint(a, 149, b, 'distance')).toBeNull()
  })
})

describe('alignedRange', () => {
  it('the same range for the same track', () => {
    const a = axisTrack(parseTrack(run))
    expect(alignedRange(a, [20, 80], a, 'distance')).toEqual([20, 80])
  })

  it('is cut at the end of the shorter track, and null when it starts past it', () => {
    const a = axisTrack(trackOf(linePoints([0, 100, 200, 300, 400])))
    const b = axisTrack(trackOf(linePoints([0, 100, 200, 250])))
    expect(alignedRange(a, [1, 4], b, 'distance')).toEqual([1, 3])
    expect(alignedRange(a, [3, 4], b, 'distance')).toBeNull()
  })

  it('null when fewer than 2 points of the other track are inside', () => {
    const a = axisTrack(trackOf(linePoints([0, 10, 20, 30, 40, 50, 60])))
    const b = axisTrack(trackOf(linePoints([0, 25, 60])))
    expect(alignedRange(a, [1, 3], b, 'distance')).toBeNull()
    expect(alignedRange(a, [1, 6], b, 'distance')).toEqual([1, 2])
  })

  it('skips the pause between segments on the time axis', () => {
    const b = parseTrack(bike)
    const t = axisTrack(b, 'time')
    const second = b.segmentStarts[1]
    expect(alignedRange(t, [second - 5, second + 5], t, 'time')).toEqual([second - 5, second + 5])
  })

  it('null on the time axis for an untimed track', () => {
    const timed = axisTrack(parseTrack(run), 'time')
    const untimed = axisTrack(parseTrack(noEleTime), 'time')
    expect(alignedRange(timed, [0, 100], untimed, 'time')).toBeNull()
  })
})

describe('rangeOwner', () => {
  it('the track that reaches further on the axis; A on a tie', () => {
    const long = axisTrack(trackOf(linePoints([0, 100, 200])))
    const short = axisTrack(trackOf(linePoints([0, 150])))
    expect(rangeOwner(long, short)).toBe('a')
    expect(rangeOwner(short, long)).toBe('b')
    expect(rangeOwner(long, long)).toBe('a')
  })

  it('depends on the axis: shorter but slower reaches further in time', () => {
    const fast = trackOf(constantSpeedPoints(10, 3))
    const slow = trackOf(linePoints([0, 10, 20], [0, 20, 40]))
    expect(rangeOwner(axisTrack(fast), axisTrack(slow))).toBe('a')
    expect(rangeOwner(axisTrack(fast, 'time'), axisTrack(slow, 'time'))).toBe('b')
  })

  it('a track with no point on the axis never owns', () => {
    const untimed = axisTrack(parseTrack(noEleTime), 'time')
    const timed = axisTrack(parseTrack(run), 'time')
    expect(rangeOwner(untimed, timed)).toBe('b')
    expect(rangeOwner(timed, untimed)).toBe('a')
  })
})

describe('large tracks', () => {
  it('10 000 lookups on a 50 000-point pair stay fast (binary search, no scans)', () => {
    const n = 50_000
    const a = axisTrack(trackOf(constantSpeedPoints(n, 3)))
    const b = axisTrack(trackOf(constantSpeedPoints(n, 2.7)))
    const started = performance.now()
    let found = 0
    for (let k = 0; k < 10_000; k++) {
      const i = (k * 4999) % n
      if (alignedPoint(a, i, b, 'distance') !== null) found++
      alignedRange(a, [i, Math.min(n - 1, i + 500)], b, 'distance')
    }
    const elapsed = performance.now() - started
    expect(found).toBeGreaterThan(8_000)
    // Linear scans would take seconds here (2 × 10 000 × 50 000 steps).
    expect(elapsed).toBeLessThan(500)
  })
})
