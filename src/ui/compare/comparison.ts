// Pure: two loaded tracks lined up on the charts' current x-axis, for every view of the comparison.
import { getAvailableFields, getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import type { XAxisMode } from '../charts/xAxis.ts'
import type { LoadedTrack } from '../upload/loadGpxFile.ts'
import type { Units } from '../units/units.ts'
import type { Hover, PointRange } from '../view/index.ts'
import {
  alignedPoint,
  alignedRange,
  buildAxisLine,
  rangeOwner,
  type AxisTrack,
} from './alignment.ts'
import { TRACK_COLORS, TRACK_IDS, trackName, type TrackEntry, type TrackId } from './trackIds.ts'

export interface Comparison {
  /** A, then B. */
  entries: readonly [TrackEntry, TrackEntry]
  /** The charts' x-axis; positions are compared on it. */
  mode: XAxisMode
  units: Units
  /** Each track's points on the axis (display units, like the charts). */
  axes: Record<TrackId, AxisTrack>
  /** The track reaching further on the axis: ranges and hovers made on a chart are stored on it. */
  owner: TrackId
  entry(id: TrackId): TrackEntry
  /** The hovered point on track `id`: the hovered point itself, or the one at its position. */
  pointOn(hover: Hover, id: TrackId): number | null
  /** The points of track `id` over a range stored on `rangeTrack` (absent means A); null below 2 points. */
  rangeOn(range: PointRange, rangeTrack: TrackId | undefined, id: TrackId): PointRange | null
}

/** Metrics per track object, so a track keeps its metrics when it moves from B to A. */
const metricsCache = new WeakMap<Track, TrackMetrics>()

function metricsOf(track: Track): TrackMetrics {
  let metrics = metricsCache.get(track)
  if (!metrics) {
    metrics = getTrackMetrics(track)
    metricsCache.set(track, metrics)
  }
  return metrics
}

/** The loaded tracks (A first) with their ids, metrics, names and colors. */
export function getTrackEntries(tracks: readonly LoadedTrack[]): TrackEntry[] {
  return tracks.slice(0, TRACK_IDS.length).map((loaded, i) => {
    const id = TRACK_IDS[i]
    return {
      id,
      loaded,
      track: loaded.track,
      metrics: metricsOf(loaded.track),
      name: trackName(loaded),
      color: TRACK_COLORS[id],
    }
  })
}

/** The chosen x-axis when every track has timestamps; otherwise distance. */
export function axisModeFor(tracks: readonly Track[], chosen: XAxisMode): XAxisMode {
  return tracks.every((t) => getAvailableFields(t).time) ? chosen : 'distance'
}

export function createComparison(
  [a, b]: readonly [TrackEntry, TrackEntry],
  mode: XAxisMode,
  units: Units,
): Comparison {
  const axes: Record<TrackId, AxisTrack> = {
    a: { metrics: a.metrics, line: buildAxisLine(a.track, a.metrics, mode, units) },
    b: { metrics: b.metrics, line: buildAxisLine(b.track, b.metrics, mode, units) },
  }
  return {
    entries: [a, b],
    mode,
    units,
    axes,
    owner: rangeOwner(axes.a, axes.b),
    entry: (id) => (id === 'a' ? a : b),
    pointOn(hover, id) {
      const from = hover.track ?? 'a'
      if (from === id) return hover.index
      return alignedPoint(axes[from], hover.index, axes[id], mode, units)
    },
    rangeOn(range, rangeTrack, id) {
      const from = rangeTrack ?? 'a'
      if (from === id) return range
      return alignedRange(axes[from], range, axes[id], mode, units)
    },
  }
}
