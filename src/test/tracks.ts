// Helpers for building tracks in tests.
import type { Track, TrackPoint } from '../model/index.ts'
import { parseGpx } from '../parser/index.ts'

/** Parse a fixture, failing the test on a parse error. */
export function parseTrack(text: string): Track {
  const result = parseGpx(text)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.track
}

/** Meters per degree of latitude (haversine, R = 6 371 008.8 m). */
export const METERS_PER_DEG_LAT = (6_371_008.8 * Math.PI) / 180

/** Points along the equator heading north: `meters[i]` from the start at `seconds[i]`. */
export function linePoints(meters: number[], seconds?: (number | undefined)[]): TrackPoint[] {
  return meters.map((m, i) => {
    const s = seconds?.[i]
    const p: TrackPoint = { lat: m / METERS_PER_DEG_LAT, lon: 0 }
    if (s !== undefined) p.time = Date.UTC(2026, 0, 1) + s * 1000
    return p
  })
}

/** `n` points 1 s apart moving at `speed` m/s. */
export function constantSpeedPoints(n: number, speed: number, startSecond = 0): TrackPoint[] {
  const idx = Array.from({ length: n }, (_, i) => i)
  return linePoints(
    idx.map((i) => i * speed),
    idx.map((i) => startSecond + i),
  )
}
