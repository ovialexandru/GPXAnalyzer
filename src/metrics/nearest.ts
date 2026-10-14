import type { Track } from '../model/index.ts'
import { getTrackBounds } from './geometry.ts'

/**
 * Returns a finder for the nearest track point to (lat, lon), using an equirectangular
 * projection precomputed once per track. Linear scan, O(n) per call. Null for an empty track.
 */
export function createNearestPointFinder(
  track: Track,
): (lat: number, lon: number) => number | null {
  const bounds = getTrackBounds(track)
  const n = track.points.length
  // Longitude degrees shrink with latitude; one scale at the track's middle latitude is accurate at track scale.
  const lonScale = bounds ? Math.cos((((bounds.south + bounds.north) / 2) * Math.PI) / 180) : 1
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  track.points.forEach((p, i) => {
    xs[i] = p.lon * lonScale
    ys[i] = p.lat
  })

  return (lat, lon) => {
    if (n === 0) return null
    const x = lon * lonScale
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < n; i++) {
      const dx = xs[i] - x
      const dy = ys[i] - lat
      const d = dx * dx + dy * dy
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    }
    return best
  }
}
