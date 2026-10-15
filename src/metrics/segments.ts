import type { Track } from '../model/index.ts'

/** Inclusive point indices [first, last]. */
export type PointRange = [first: number, last: number]

/** [start, end) point index ranges, one per non-empty segment. */
export function getSegmentRanges(track: Track): [number, number][] {
  const { points, segmentStarts } = track
  const ranges: [number, number][] = []
  for (let s = 0; s < segmentStarts.length; s++) {
    const start = segmentStarts[s]
    const end = s + 1 < segmentStarts.length ? segmentStarts[s + 1] : points.length
    if (end > start) ranges.push([start, end])
  }
  return ranges
}

/**
 * The [start, end) parts of each segment that lie inside `range` (all segments when omitted).
 * Interval rules that never cross a segment boundary then also stay inside the range.
 */
export function clipSegmentRanges(track: Track, range?: PointRange): [number, number][] {
  const ranges = getSegmentRanges(track)
  if (!range) return ranges
  const [first, last] = range
  const clipped: [number, number][] = []
  for (const [start, end] of ranges) {
    const s = Math.max(start, first)
    const e = Math.min(end, last + 1)
    if (e > s) clipped.push([s, e])
  }
  return clipped
}
