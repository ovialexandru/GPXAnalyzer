import L from 'leaflet'
import { getSegmentLines, type TrackBounds } from '../../metrics/index.ts'
import type { Track, TrackPoint } from '../../model/index.ts'
import { getColorRuns, type SpeedColoring } from './speedColors.ts'

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
export const TILE_MAX_ZOOM = 19

const LINE_STYLE: L.PolylineOptions = { color: '#1d4ed8', weight: 4, interactive: false }
const MARKER_STYLE: L.CircleMarkerOptions = {
  radius: 7,
  color: '#ffffff',
  weight: 2,
  fillOpacity: 1,
}
const START_COLOR = '#16a34a'
const END_COLOR = '#dc2626'

/** Padding (px) and maximum zoom when fitting the map to a track. */
export const FIT_OPTIONS: L.FitBoundsOptions = { padding: [24, 24], maxZoom: 16 }

function markerLabel(label: string, point: TrackPoint): string {
  return point.time === undefined ? label : `${label} · ${new Date(point.time).toLocaleString()}`
}

function endpointMarker(point: TrackPoint, fillColor: string, label: string): L.CircleMarker {
  return L.circleMarker([point.lat, point.lon], { ...MARKER_STYLE, fillColor }).bindTooltip(
    markerLabel(label, point),
  )
}

export interface TrackLayers {
  group: L.LayerGroup
  /** The segment lines in `group`, without the markers. */
  lines: L.Polyline[]
}

/**
 * One polyline per segment (or, with `coloring`, per run of one speed color), then start/end
 * markers so they are drawn above the line.
 */
export function createTrackLayers(track: Track, coloring?: SpeedColoring | null): TrackLayers {
  const lines = coloring
    ? getColorRuns(track, coloring).map((run) =>
        L.polyline(run.latlngs, { ...LINE_STYLE, color: run.color }),
      )
    : getSegmentLines(track).map((line) => L.polyline(line, LINE_STYLE))
  const layers: L.Layer[] = [...lines]
  const first = track.points[0]
  const last = track.points.at(-1)
  if (first && last) {
    layers.push(endpointMarker(first, START_COLOR, 'Start'))
    layers.push(endpointMarker(last, END_COLOR, 'Finish'))
  }
  return { group: L.layerGroup(layers), lines }
}

/** Fit the map to the bounds; does nothing when there are none. */
export function fitTrack(map: L.Map, bounds: TrackBounds | null): void {
  if (!bounds) return
  map.fitBounds(
    [
      [bounds.south, bounds.west],
      [bounds.north, bounds.east],
    ],
    FIT_OPTIONS,
  )
}
