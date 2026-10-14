import type { Track } from '../model/index.ts'

/** IUGG mean Earth radius in meters. */
const EARTH_RADIUS = 6_371_008.8

const toRad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in meters (haversine, mean Earth radius 6 371 008.8 m). */
export function haversineDistance(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * EARTH_RADIUS * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Cumulative distance in meters per point. A segment's first point repeats the previous value (gaps are skipped). */
export function getCumulativeDistance(track: Track): number[] {
  const { points, segmentStarts } = track
  const starts = new Set(segmentStarts)
  const distance = new Array<number>(points.length)
  let total = 0
  for (let i = 0; i < points.length; i++) {
    if (i > 0 && !starts.has(i)) total += haversineDistance(points[i - 1], points[i])
    distance[i] = total
  }
  return distance
}
