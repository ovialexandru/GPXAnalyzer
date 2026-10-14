import L from 'leaflet'
import { getSegmentRanges } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import type { PointRange } from '../view/index.ts'

/** Class on the highlight's SVG paths. */
export const SELECTION_CLASS = 'track-selection'

const SELECTION_STYLE: L.PolylineOptions = {
  color: '#ea580c',
  weight: 5,
  interactive: false,
  className: SELECTION_CLASS,
}

/** Opacity of the base track while a selection is shown. */
export const DIMMED_OPACITY = 0.35

/**
 * The selected points [first, last] (inclusive) as one polyline per segment part, drawn on
 * `renderer` (an SVG renderer, above the canvas track). Parts with a single point are left out.
 */
export function createSelectionLayers(
  track: Track,
  [first, last]: PointRange,
  renderer: L.Renderer = L.svg(),
): L.LayerGroup {
  const lines: L.Polyline[] = []
  for (const [start, end] of getSegmentRanges(track)) {
    const from = Math.max(start, first)
    const to = Math.min(end, last + 1)
    if (to - from < 2) continue
    const latlngs = track.points.slice(from, to).map((p): L.LatLngTuple => [p.lat, p.lon])
    lines.push(L.polyline(latlngs, { ...SELECTION_STYLE, renderer }))
  }
  return L.layerGroup(lines)
}
