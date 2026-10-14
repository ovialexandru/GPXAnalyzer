import type { Track } from '../model/index.ts'
import { constantSpeedPoints, linePoints, METERS_PER_DEG_LAT } from '../test/tracks.ts'
import {
  getCumulativeDistance,
  getElapsedTime,
  getPaceSeries,
  getSpeedSeries,
  STOPPED_SPEED,
} from './index.ts'

function speeds(track: Track): (number | null)[] {
  return getSpeedSeries(track, getCumulativeDistance(track), getElapsedTime(track))
}

describe('getElapsedTime', () => {
  it('counts seconds from the first timed point; null where time is missing', () => {
    const points = linePoints([0, 1, 2, 3], [undefined, 10, 12, 15])
    expect(getElapsedTime({ points, segmentStarts: [0] })).toEqual([null, 0, 2, 5])
  })

  it('all null for a track without time', () => {
    expect(getElapsedTime({ points: linePoints([0, 1]), segmentStarts: [0] })).toEqual([null, null])
  })
})

describe('getSpeedSeries', () => {
  it('constant 10 m/s gives 10 m/s at every point, including the ends', () => {
    const s = speeds({ points: constantSpeedPoints(30, 10), segmentStarts: [0] })
    expect(s).toHaveLength(30)
    for (const v of s) expect(v).toBeCloseTo(10, 2)
  })

  it('stationary points have speed 0', () => {
    const points = linePoints(Array(10).fill(0), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(speeds({ points, segmentStarts: [0] })).toEqual(Array(10).fill(0))
  })

  it('sparse recording (10 s apart) uses the neighbours', () => {
    const points = linePoints([0, 30, 60, 90, 120], [0, 10, 20, 30, 40])
    const s = speeds({ points, segmentStarts: [0] })
    for (const v of s) expect(v).toBeCloseTo(3, 6)
  })

  it('the window never crosses a segment boundary', () => {
    // 3 m/s, then a 200 s pause with a 50 m jump, then 3 m/s again.
    const first = constantSpeedPoints(10, 3)
    const second = linePoints(
      Array.from({ length: 10 }, (_, i) => 77 + i * 3),
      Array.from({ length: 10 }, (_, i) => 209 + i),
    )
    const s = speeds({ points: [...first, ...second], segmentStarts: [0, 10] })
    for (const v of s) expect(v).toBeCloseTo(3, 2)
  })

  it('a point without time is null; its neighbours are unaffected', () => {
    const points = constantSpeedPoints(10, 4)
    delete points[5].time
    const s = speeds({ points, segmentStarts: [0] })
    expect(s[5]).toBeNull()
    for (const i of [3, 4, 6, 7]) expect(s[i]).toBeCloseTo(4, 2)
  })

  it('single-point segment → null', () => {
    const points = [...constantSpeedPoints(5, 2), ...constantSpeedPoints(1, 2, 100)]
    expect(speeds({ points, segmentStarts: [0, 5] })[5]).toBeNull()
  })

  it('Δtime ≤ 0 → null', () => {
    const points = linePoints([0, 10], [5, 5])
    expect(speeds({ points, segmentStarts: [0] })).toEqual([null, null])
  })

  it('track without time → all null', () => {
    expect(speeds({ points: linePoints([0, 10, 20]), segmentStarts: [0] })).toEqual([
      null,
      null,
      null,
    ])
  })

  it('damps a single 1 s GPS spike compared to raw point-to-point speed', () => {
    const points = constantSpeedPoints(21, 3)
    points[10] = { ...points[10], lon: 20 / METERS_PER_DEG_LAT } // 20 m sideways
    const track = { points, segmentStarts: [0] }
    const d = getCumulativeDistance(track)
    const raw = d[10] - d[9] // 1 s apart
    const smoothed = speeds(track)[10]!
    expect(raw).toBeGreaterThan(15)
    expect(smoothed).toBeLessThan(raw * 0.7)
  })
})

describe('getPaceSeries', () => {
  it('pace = 1 / speed at or above the stopped threshold, null below', () => {
    expect(STOPPED_SPEED).toBe(0.5)
    const pace = getPaceSeries([10, 0.6, 0.5, 0.4, 0, null])
    expect(pace[0]).toBeCloseTo(0.1, 6)
    expect(pace[1]).toBeCloseTo(1.667, 3)
    expect(pace[2]).toBe(2)
    expect(pace.slice(3)).toEqual([null, null, null])
  })
})
