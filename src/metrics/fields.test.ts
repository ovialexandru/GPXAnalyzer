import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import type { Track } from '../model/index.ts'
import { parseGpx } from '../parser/index.ts'
import { getAvailableFields } from './index.ts'

function track(text: string): Track {
  const result = parseGpx(text)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.track
}

describe('getAvailableFields', () => {
  it('run.gpx: all fields available', () => {
    expect(getAvailableFields(track(run))).toEqual({ ele: true, time: true, hr: true, cad: true })
  })

  it('bike.gpx: no cadence', () => {
    expect(getAvailableFields(track(bike))).toEqual({ ele: true, time: true, hr: true, cad: false })
  })

  it('no-ele-time.gpx: no optional fields', () => {
    expect(getAvailableFields(track(noEleTime))).toEqual({
      ele: false,
      time: false,
      hr: false,
      cad: false,
    })
  })

  it('counts a field present on only one point', () => {
    const t: Track = {
      points: [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 0, hr: 120 },
      ],
      segmentStarts: [0],
    }
    expect(getAvailableFields(t)).toEqual({ ele: false, time: false, hr: true, cad: false })
  })
})
