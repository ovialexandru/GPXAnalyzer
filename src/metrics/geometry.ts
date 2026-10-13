import type { Track } from '../model/index.ts'

/** [lat, lon] in degrees; plain tuples so metrics stays free of Leaflet types. */
export type LatLon = [number, number]

/** Bounding box in degrees. */
export interface TrackBounds {
  south: number
  west: number
  north: number
  east: number
}

/** One coordinate list per segment, split at `track.segmentStarts`. Empty segments are skipped. */
export function getSegmentLines(track: Track): LatLon[][] {
  const { points, segmentStarts } = track
  const lines: LatLon[][] = []
  for (let s = 0; s < segmentStarts.length; s++) {
    const start = segmentStarts[s]
    const end = s + 1 < segmentStarts.length ? segmentStarts[s + 1] : points.length
    if (end <= start) continue
    lines.push(points.slice(start, end).map((p): LatLon => [p.lat, p.lon]))
  }
  return lines
}

/** Bounding box of all points; null for a track with no points. */
export function getTrackBounds(track: Track): TrackBounds | null {
  const { points } = track
  if (points.length === 0) return null
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const p of points) {
    if (p.lat < south) south = p.lat
    if (p.lat > north) north = p.lat
    if (p.lon < west) west = p.lon
    if (p.lon > east) east = p.lon
  }
  return { south, west, north, east }
}
