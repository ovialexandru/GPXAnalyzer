// Shared data model. Units are SI; formatting happens only in the UI.

/** One recorded GPX `trkpt`. Optional fields are absent when the file lacks them. */
export interface TrackPoint {
  /** Latitude in degrees (WGS84). */
  lat: number
  /** Longitude in degrees (WGS84). */
  lon: number
  /** Elevation in meters. */
  ele?: number
  /** Timestamp in epoch milliseconds (UTC). */
  time?: number
  /** Heart rate in beats per minute. */
  hr?: number
  /** Cadence in revolutions or steps per minute, as recorded. */
  cad?: number
}

/** A parsed track. Map and charts refer to points by index into `points`. */
export interface Track {
  name?: string
  /** All segments concatenated in file order. */
  points: TrackPoint[]
  /** Index into `points` where each segment begins; the first entry is 0. */
  segmentStarts: number[]
}
