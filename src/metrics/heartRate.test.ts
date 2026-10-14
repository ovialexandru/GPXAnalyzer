import type { Track } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { linePoints, parseTrack } from '../test/tracks.ts'
import { getAverageHeartRate, getElapsedTime } from './index.ts'

/** Points with the given HR at the given seconds (undefined = no time). */
function withHr(hrs: (number | undefined)[], seconds?: number[], segmentStarts = [0]): Track {
  const points = linePoints(
    hrs.map(() => 0),
    seconds,
  ).map((p, i) => (hrs[i] === undefined ? p : { ...p, hr: hrs[i] }))
  return { points, segmentStarts }
}

function avg(track: Track) {
  return getAverageHeartRate(track, getElapsedTime(track))
}

describe('getAverageHeartRate', () => {
  it('even 1 s sampling equals the mean of the samples that start an interval', () => {
    expect(avg(withHr([120, 130, 140, 150, 999], [0, 1, 2, 3, 4]))).toBe(135)
  })

  it('weights each sample by the time until the next point', () => {
    // 100 bpm held 1 s, 160 bpm held 9 s (plain mean of the two would be 130).
    expect(avg(withHr([100, 160, 160], [0, 1, 10]))).toBe(154)
  })

  it('excludes the pause between segments', () => {
    // 100 bpm for 2 s, then a 600 s pause, then 160 bpm for 2 s.
    expect(avg(withHr([100, 100, 100, 160, 160, 160], [0, 1, 2, 602, 603, 604], [0, 3]))).toBe(130)
  })

  it('points without HR start no interval', () => {
    expect(avg(withHr([undefined, 150, undefined], [0, 5, 10]))).toBe(150)
  })

  it('HR without time → plain mean', () => {
    expect(avg(withHr([100, 120, 170]))).toBe(130)
  })

  it('no HR or no points → null', () => {
    expect(avg(withHr([undefined, undefined], [0, 1]))).toBeNull()
    expect(avg({ points: [], segmentStarts: [0] })).toBeNull()
    expect(avg(parseTrack(noEleTime))).toBeNull()
  })

  it.each([
    ['run.gpx', run, 143.82],
    ['bike.gpx', bike, 155.95],
  ])('%s: %f bpm', (_n, text, bpm) => {
    expect(Math.abs(avg(parseTrack(text))! - bpm)).toBeLessThanOrEqual(0.05)
  })
})
