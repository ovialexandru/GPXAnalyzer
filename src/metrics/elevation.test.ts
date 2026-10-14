import type { Track } from '../model/index.ts'
import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import { parseTrack } from '../test/tracks.ts'
import { getElevationChange } from './index.ts'

function withElevation(eles: (number | undefined)[], segmentStarts = [0]): Track {
  return { points: eles.map((ele) => ({ lat: 0, lon: 0, ele })), segmentStarts }
}

const NOISE = [100, 101, 99, 102, 100, 98, 101, 100, 102, 99, 100, 101, 98, 100]

describe('getElevationChange', () => {
  it('steady climb 0 → 100 m in 1 m steps: gain 99, loss 0', () => {
    const eles = Array.from({ length: 101 }, (_, i) => i)
    expect(getElevationChange(withElevation(eles))).toEqual({ gain: 99, loss: 0 })
  })

  it('±1–2 m noise on flat ground: no gain or loss', () => {
    expect(getElevationChange(withElevation(NOISE))).toEqual({ gain: 0, loss: 0 })
  })

  it('climb 50 m then descend 50 m', () => {
    const up = Array.from({ length: 51 }, (_, i) => i)
    const down = Array.from({ length: 50 }, (_, i) => 49 - i)
    const change = getElevationChange(withElevation([...up, ...down]))!
    expect(Math.abs(change.gain - 50)).toBeLessThanOrEqual(3)
    expect(Math.abs(change.loss - 50)).toBeLessThanOrEqual(3)
  })

  it('a smaller threshold counts more of the noise', () => {
    const track = withElevation(NOISE)
    expect(getElevationChange(track, 1)!.gain).toBeGreaterThan(getElevationChange(track)!.gain)
  })

  it('skips points without elevation', () => {
    expect(getElevationChange(withElevation([0, undefined, 5, undefined, 10]))).toEqual({
      gain: 10,
      loss: 0,
    })
  })

  it('null when no point has elevation', () => {
    expect(getElevationChange(withElevation([undefined, undefined]))).toBeNull()
    expect(getElevationChange(parseTrack(noEleTime))).toBeNull()
  })

  it('continues across a segment boundary', () => {
    // 2 m before the boundary and 2 m after it add up to one counted 4 m climb.
    expect(getElevationChange(withElevation([0, 2, 4], [0, 2]))).toEqual({ gain: 4, loss: 0 })
  })

  it.each([
    ['run.gpx', run, 6.0, 3.2],
    ['bike.gpx', bike, 22.4, 17.6],
  ])('%s: gain %f m, loss %f m', (_n, text, gain, loss) => {
    const change = getElevationChange(parseTrack(text))!
    expect(change.gain).toBeCloseTo(gain, 1)
    expect(change.loss).toBeCloseTo(loss, 1)
  })
})
