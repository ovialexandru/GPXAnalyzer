import type { Track } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { linePoints, parseTrack } from '../test/tracks.ts'
import { getCadenceStats, getElapsedTime, getSensorStats, type PointRange } from './index.ts'

/** Points with the given cadence at the given seconds (undefined = no sample / no time). */
function withCad(cads: (number | undefined)[], seconds?: number[], segmentStarts = [0]): Track {
  const points = linePoints(
    cads.map(() => 0),
    seconds,
  ).map((p, i) => (cads[i] === undefined ? p : { ...p, cad: cads[i] }))
  return { points, segmentStarts }
}

const cadence = (track: Track, range?: PointRange) =>
  getCadenceStats(track, getElapsedTime(track), range)

describe('getCadenceStats', () => {
  it('weights each sample by the time until the next point', () => {
    // 60 rpm held 1 s, 90 rpm held 9 s.
    expect(cadence(withCad([60, 90, 90], [0, 1, 10])).average).toBe(87)
  })

  it('leaves zero samples out of the average (stopped or coasting)', () => {
    expect(cadence(withCad([80, 0, 0, 80, 80], [0, 1, 2, 3, 4])).average).toBe(80)
  })

  it('falls back to the plain mean of non-zero samples without time', () => {
    expect(cadence(withCad([70, 0, 90])).average).toBe(80)
  })

  it('all zeros: average null, max 0; no cadence: both null', () => {
    expect(cadence(withCad([0, 0, 0], [0, 1, 2]))).toEqual({ average: null, max: 0 })
    expect(cadence(parseTrack(bike))).toEqual({ average: null, max: null })
  })

  it('only intervals inside the range count', () => {
    expect(cadence(withCad([60, 90, 90], [0, 1, 10]), [1, 2]).average).toBe(90)
  })

  it('an interval across a segment boundary is excluded', () => {
    expect(cadence(withCad([60, 60, 90, 90], [0, 1, 100, 101], [0, 2])).average).toBe(75)
  })

  it('max: largest sample in range, skipping missing ones', () => {
    const track = withCad([70, undefined, 95, 80])
    expect(cadence(track).max).toBe(95)
    expect(cadence(track, [0, 1]).max).toBe(70)
    expect(cadence(track, [1, 1]).max).toBeNull()
  })

  it.each([
    ['whole', undefined, 69.25, 79],
    ['[30, 119]', [30, 119] as PointRange, 70.98, 77],
  ])('run.gpx %s: avg %f rpm, max %i rpm (reference)', (_n, range, avg, max) => {
    const stats = cadence(parseTrack(run), range)
    expect(Math.abs(stats.average! - avg)).toBeLessThanOrEqual(0.01)
    expect(stats.max).toBe(max)
  })
})

describe('getSensorStats', () => {
  it('without a filter, zeros count', () => {
    const track = withCad([80, 0, 0, 80, 80], [0, 1, 2, 3, 4])
    expect(getSensorStats(track, getElapsedTime(track), 'cad').average).toBe(40)
  })

  it.each([
    ['run.gpx', run, undefined, 159],
    ['run.gpx', run, [30, 119] as PointRange, 159],
    ['bike.gpx', bike, undefined, 166],
    ['bike.gpx', bike, [50, 149] as PointRange, 166],
    ['no-ele-time.gpx', noEleTime, undefined, null],
  ])('%s %j: max HR %s (reference)', (_n, text, range, max) => {
    const track = parseTrack(text)
    expect(getSensorStats(track, getElapsedTime(track), 'hr', range).max).toBe(max)
  })
})
