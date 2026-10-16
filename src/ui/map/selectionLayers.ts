import L from 'leaflet'
import { getSegmentRanges } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import type { PointRange } from '../view/index.ts'
import { getColorRuns, type SpeedColoring } from './speedColors.ts'

/** Class on the highlight's SVG paths. */
export const SELECTION_CLASS = 'track-selection'

/** The highlight's color on a plain track. */
export const SELECTION_COLOR = '#ea580c'

const SELECTION_STYLE: L.PolylineOptions = {
  color: SELECTION_COLOR,
  weight: 5,
  interactive: false,
  className: SELECTION_CLASS,
}

/** Opacity of the base track while a selection is shown. */
export const DIMMED_OPACITY = 0.35

/**
 * The selected points [first, last] (inclusive) as one polyline per segment part, drawn on
 * `renderer` (an SVG renderer, above the canvas track). Parts with a single point are left out.
 * With `coloring`, the parts are drawn in their speed colors instead of orange; with `color`, in
 * that color (a compared track's own).
 */
export function createSelectionLayers(
  track: Track,
  [first, last]: PointRange,
  renderer: L.Renderer = L.svg(),
  coloring?: SpeedColoring | null,
  color?: string,
): L.LayerGroup {
  if (coloring) {
    const runs = getColorRuns(track, coloring, [first, last])
    return L.layerGroup(
      runs.map((run) =>
        L.polyline(run.latlngs, { ...SELECTION_STYLE, color: run.color, renderer }),
      ),
    )
  }
  const lines: L.Polyline[] = []
  for (const [start, end] of getSegmentRanges(track)) {
    const from = Math.max(start, first)
    const to = Math.min(end, last + 1)
    if (to - from < 2) continue
    const latlngs = track.points.slice(from, to).map((p): L.LatLngTuple => [p.lat, p.lon])
    lines.push(
      L.polyline(
        latlngs,
        color ? { ...SELECTION_STYLE, color, renderer } : { ...SELECTION_STYLE, renderer },
      ),
    )
  }
  return L.layerGroup(lines)
}
