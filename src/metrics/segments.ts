import type { Track } from '../model/index.ts'

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
