import type { Track } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { constantSpeedPoints, linePoints, parseTrack } from '../test/tracks.ts'
import { getCumulativeDistance, getElapsedTime, getMovingStats, getSpeedSeries } from './index.ts'

function moving(track: Track) {
  const distance = getCumulativeDistance(track)
  const elapsed = getElapsedTime(track)
  return getMovingStats(track, distance, elapsed, getSpeedSeries(track, distance, elapsed))
}

describe('getMovingStats', () => {
  it('constant motion: moving time = duration, moving distance = total distance', () => {
    const stats = moving({ points: constantSpeedPoints(30, 3), segmentStarts: [0] })!
    expect(stats.time).toBe(29)
    expect(stats.distance).toBeCloseTo(87, 6)
  })

  it('stationary track: nothing moving', () => {
    const points = linePoints(Array(10).fill(0), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(moving({ points, segmentStarts: [0] })).toEqual({ time: 0, distance: 0 })
  })

  it('a 20 s stop is excluded', () => {
    // 30 s at 3 m/s, 20 s stopped, 30 s at 3 m/s; points 1 s apart.
    const meters: number[] = []
    for (let s = 0; s <= 80; s++) meters.push(s <= 30 ? s * 3 : s <= 50 ? 90 : 90 + (s - 50) * 3)
    const track = {
      points: linePoints(
        meters,
        meters.map((_, s) => s),
      ),
      segmentStarts: [0],
    }
    const stats = moving(track)!
    // The 5 s window blurs the stop's edges by a couple of seconds.
    expect(Math.abs(stats.time - 60)).toBeLessThanOrEqual(4)
    expect(Math.abs(stats.distance - 180)).toBeLessThanOrEqual(6)
  })

  it('never counts the pause between segments', () => {
    const first = constantSpeedPoints(10, 3)
    const second = constantSpeedPoints(10, 3, 300).map((p) => ({ ...p, lat: p.lat + 0.01 }))
    const stats = moving({ points: [...first, ...second], segmentStarts: [0, 10] })!
    expect(stats.time).toBe(18)
    expect(stats.distance).toBeCloseTo(54, 6)
  })

  it('track without time → null', () => {
    expect(moving({ points: linePoints([0, 10, 20]), segmentStarts: [0] })).toBeNull()
    expect(moving(parseTrack(noEleTime))).toBeNull()
  })

  it.each([
    ['run.gpx', run, 644],
    ['bike.gpx', bike, 517],
  ])('%s: moving time %i s', (_n, text, time) => {
    expect(moving(parseTrack(text))!.time).toBe(time)
  })
})

describe('getMovingStats with a range', () => {
  function movingIn(track: Track, range: [number, number]) {
    const distance = getCumulativeDistance(track)
    const elapsed = getElapsedTime(track)
    const speed = getSpeedSeries(track, distance, elapsed)
    return getMovingStats(track, distance, elapsed, speed, range)
  }

  it('counts only intervals inside the range', () => {
    const track = { points: constantSpeedPoints(30, 3), segmentStarts: [0] }
    const stats = movingIn(track, [5, 14])!
    expect(stats.time).toBe(9)
    expect(stats.distance).toBeCloseTo(27, 6)
  })

  it('a pause between segments inside the range is not counted', () => {
    const first = constantSpeedPoints(10, 3)
    const second = constantSpeedPoints(10, 3, 300).map((p) => ({ ...p, lat: p.lat + 0.01 }))
    const stats = movingIn({ points: [...first, ...second], segmentStarts: [0, 10] }, [5, 14])!
    // 5 → 9 and 10 → 14: 8 intervals of 1 s.
    expect(stats.time).toBe(8)
  })

  it('adjacent ranges add up to the whole', () => {
    const track = parseTrack(bike)
    const a = movingIn(track, [0, 100])!
    const b = movingIn(track, [100, 199])!
    expect(a.time + b.time).toBe(517)
  })

  it('a range without time → null', () => {
    expect(movingIn(parseTrack(noEleTime), [10, 59])).toBeNull()
  })

  it('without a range: same as the whole track', () => {
    const track = parseTrack(run)
    expect(movingIn(track, [0, 149])).toEqual(moving(track))
  })
})
