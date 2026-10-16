// How the map draws the track: one plain color, or colored by speed.

export type TrackColor = 'plain' | 'speed'

const STORAGE_KEY = 'gpx-analyzer.trackColor'

/** The remembered choice; Plain when missing, invalid, or storage is unavailable. */
export function loadTrackColor(): TrackColor {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'speed' ? 'speed' : 'plain'
  } catch {
    return 'plain'
  }
}

/** Remembers the choice; storage errors (private mode, blocked site data) are ignored. */
export function saveTrackColor(trackColor: TrackColor): void {
  try {
    localStorage.setItem(STORAGE_KEY, trackColor)
  } catch {
    // Not remembered: the choice still applies to this visit.
  }
}
