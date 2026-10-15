import type { Track, TrackPoint } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { linePoints, parseTrack } from '../test/tracks.ts'
import {
  getCumulativeDistance,
  getElapsedTime,
  getMaxSpeed,
  getMaxSpeedInRange,
  getSettleIgnored,
  getSpeedSeries,
  SETTLE_GAP_SECONDS,
  SETTLE_SECONDS,
} from './index.ts'

/** Points 1 s apart; `kmh[i]` is the speed of the interval ending at point i (`kmh[0]` unused). */
function profile(kmh: number[], startSecond = 0, startMeters = 0): TrackPoint[] {
  const meters = [startMeters]
  for (let i = 1; i < kmh.length; i++) meters.push(meters[i - 1] + kmh[i] / 3.6)
  return linePoints(
    meters,
    meters.map((_, i) => startSecond + i),
  )
}

const repeat = (kmh: number, seconds: number) => Array<number>(seconds).fill(kmh)
/** A GPS start-up spike: fast first fixes decaying to 8 km/h cruising. */
const SPIKE = [0, 20, 17, 14, 12, 11]
const lastMeters = (points: TrackPoint[]) => points.at(-1)!.lat * ((6_371_008.8 * Math.PI) / 180)

/** [filtered max, plain max] in km/h. */
function maxes(track: Track): [number | null, number | null] {
  const distance = getCumulativeDistance(track)
  const elapsed = getElapsedTime(track)
  const speed = getSpeedSeries(track, distance, elapsed)
  const plain = speed.reduce<number | null>(
    (m, v) => (v !== null && (m === null || v > m) ? v : m),
    null,
  )
  const max = getMaxSpeed(track, elapsed, speed)
  return [max === null ? null : max * 3.6, plain === null ? null : plain * 3.6]
}

const single = (points: TrackPoint[]): Track => ({ points, segmentStarts: [0] })

describe('getMaxSpeed', () => {
  it('ignores a start-up spike, including its decaying tail', () => {
    const [max, plain] = maxes(single(profile([...SPIKE, ...repeat(8, 120)])))
    expect(plain).toBeGreaterThan(15)
    expect(max).toBeCloseTo(8, 6)
  })

  it(`ignores the same spike after a recording gap > ${SETTLE_GAP_SECONDS} s`, () => {
    const before = profile([0, ...repeat(8, 120)])
    const after = profile([...SPIKE, ...repeat(8, 120)], 150, lastMeters(before) + 70)
    const [max, plain] = maxes(single([...before, ...after]))
    expect(plain).toBeGreaterThan(15)
    expect(max).toBeCloseTo(8, 6)
  })

  it(`a gap of ${SETTLE_GAP_SECONDS} s or less does not start a settle window`, () => {
    const before = profile([0, ...repeat(8, 120)])
    const after = profile([...SPIKE, ...repeat(8, 120)], 125, lastMeters(before) + 10)
    const [max, plain] = maxes(single([...before, ...after]))
    expect(max).toBe(plain)
    expect(max).toBeGreaterThan(15)
  })

  it("ignores the spike at a later segment's start", () => {
    const first = profile([0, ...repeat(8, 120)])
    const second = profile([...SPIKE, ...repeat(8, 120)], 400, lastMeters(first) + 500)
    const [max] = maxes({ points: [...first, ...second], segmentStarts: [0, first.length] })
    expect(max).toBeCloseTo(8, 6)
  })

  it.each([5, 10, 20])('keeps a real %i s sprint mid-track', (seconds) => {
    const track = single(profile([0, ...repeat(8, 150), ...repeat(16, seconds), ...repeat(8, 150)]))
    expect(maxes(track)[0]).toBeCloseTo(16, 6)
  })

  it('keeps a 15 s sprint from the start of recording', () => {
    const [max] = maxes(single(profile([0, ...repeat(16, 15), ...repeat(8, 120)])))
    expect(max).toBeCloseTo(16, 6)
  })

  it('a slow start never triggers: standing 15 s, then sprinting', () => {
    const track = single(profile([0, ...repeat(0, 15), ...repeat(16, 15), ...repeat(8, 120)]))
    const [max, plain] = maxes(track)
    expect(max).toBe(plain)
    expect(max).toBeCloseTo(16, 6)
  })

  it(`small noise in the first ${SETTLE_SECONDS} s ignores nothing`, () => {
    // ±0.3 m/s (≈ ±1.1 km/h) around 8 km/h.
    const noisy = Array.from({ length: 12 }, (_, i) => 8 + (i % 2 ? 1.08 : -1.08))
    const [max, plain] = maxes(single(profile([0, ...noisy, ...repeat(8, 120)])))
    expect(max).toBe(plain)
  })

  it('falls back to the plain max when every speed is ignored', () => {
    const [max, plain] = maxes(single(profile([0, 40, ...repeat(8, 6)])))
    expect(plain).toBeGreaterThan(20)
    expect(max).toBe(plain)
  })

  it('null without any speed', () => {
    expect(maxes(parseTrack(noEleTime))).toEqual([null, null])
    expect(maxes({ points: [], segmentStarts: [0] })).toEqual([null, null])
  })

  it.each([
    ['run.gpx', run, 13.6],
    ['bike.gpx', bike, 33.73],
  ])('%s: unchanged at %f km/h', (_n, text, kmh) => {
    const [max, plain] = maxes(parseTrack(text))
    expect(max).toBe(plain)
    expect(Math.abs(max! - kmh)).toBeLessThanOrEqual(0.01)
  })
})

describe('getMaxSpeedInRange', () => {
  function series(track: Track) {
    const distance = getCumulativeDistance(track)
    const elapsed = getElapsedTime(track)
    const speed = getSpeedSeries(track, distance, elapsed)
    return { speed, ignored: getSettleIgnored(track, elapsed, speed) }
  }
  const kmh = (v: number | null) => (v === null ? null : v * 3.6)

  it('the settle spike at the start stays ignored for a range starting at 0', () => {
    const track = single(profile([...SPIKE, ...repeat(8, 120)]))
    const { speed, ignored } = series(track)
    expect(kmh(getMaxSpeedInRange(speed, ignored, [0, 60]))).toBeCloseTo(8, 6)
  })

  it('a range starting mid-track has no settle window of its own', () => {
    // A real sprint at the start of the range is kept.
    const track = single(profile([0, ...repeat(8, 120), ...repeat(16, 5), ...repeat(8, 120)]))
    const { speed, ignored } = series(track)
    expect(ignored.every((v) => !v)).toBe(true)
    expect(kmh(getMaxSpeedInRange(speed, ignored, [121, 200]))).toBeCloseTo(16, 6)
  })

  it('falls back to the plain max of the range when all of it is ignored', () => {
    const track = single(profile([...SPIKE, ...repeat(8, 120)]))
    const { speed, ignored } = series(track)
    expect(getMaxSpeedInRange(speed, ignored, [0, 3])).toBe(
      Math.max(...(speed.slice(0, 4) as number[])),
    )
  })

  it('max of [a, b] is the max of its halves', () => {
    const { speed, ignored } = series(parseTrack(bike))
    const whole = getMaxSpeedInRange(speed, ignored, [20, 180])!
    const halves = [
      getMaxSpeedInRange(speed, ignored, [20, 90])!,
      getMaxSpeedInRange(speed, ignored, [90, 180])!,
    ]
    expect(whole).toBe(Math.max(...halves))
  })

  it('null without speed in range', () => {
    const { speed, ignored } = series(parseTrack(noEleTime))
    expect(getMaxSpeedInRange(speed, ignored, [0, 79])).toBeNull()
  })
})
