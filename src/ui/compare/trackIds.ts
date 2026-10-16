// The two compared tracks: ids, letters, colors and the per-track data the views share.
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { COMPARE_COLORS } from '../../settings.ts'
import type { LoadedTrack } from '../upload/loadGpxFile.ts'

/** Track A (the first loaded) or B (the one compared with it). */
export type TrackId = 'a' | 'b'

export const TRACK_IDS: readonly TrackId[] = ['a', 'b']

export const TRACK_LETTERS: Record<TrackId, string> = { a: 'A', b: 'B' }

export const TRACK_COLORS: Record<TrackId, string> = COMPARE_COLORS

/** A loaded track with its metrics, as every view of the comparison sees it. */
export interface TrackEntry {
  id: TrackId
  loaded: LoadedTrack
  track: Track
  metrics: TrackMetrics
  /** The track name, or the file name when the track has none. */
  name: string
  color: string
}

/** The track name, or the file name when the track has none (like the summary heading). */
export function trackName({ track, fileName }: LoadedTrack): string {
  return track.name || fileName
}
