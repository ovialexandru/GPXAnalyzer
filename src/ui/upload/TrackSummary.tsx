import { useMemo } from 'react'
import { getAvailableFields, type AvailableFields, type TrackTotals } from '../../metrics/index.ts'
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatSpeed,
} from '../format.ts'
import type { LoadedTrack } from './loadGpxFile.ts'
import styles from './TrackSummary.module.css'

const FIELD_LABELS: Record<keyof AvailableFields, string> = {
  ele: 'Elevation',
  time: 'Time',
  hr: 'Heart rate',
  cad: 'Cadence',
}

function orNull(value: number | null, format: (v: number) => string): string | null {
  return value === null ? null : format(value)
}

interface TrackSummaryProps {
  loaded: LoadedTrack
  totals: TrackTotals
}

/** Track name and file name, whole-track stats, and which optional data the track has. */
export function TrackSummary({ loaded, totals }: TrackSummaryProps) {
  const { fileName, track } = loaded
  const fields = useMemo(() => getAvailableFields(track), [track])
  const badges = (Object.keys(FIELD_LABELS) as (keyof AvailableFields)[]).filter((k) => fields[k])
  // Totals that are null (no time / no elevation) are left out.
  const stats: [string, string | null][] = [
    ['Distance', formatDistance(totals.distance)],
    ['Duration', orNull(totals.duration, formatDuration)],
    ['Elevation gain', orNull(totals.elevationGain, formatElevation)],
    ['Avg speed', orNull(totals.avgSpeed, formatSpeed)],
    ['Max speed', orNull(totals.maxSpeed, formatSpeed)],
    ['Avg HR', orNull(totals.avgHeartRate, formatHeartRate)],
  ]

  return (
    <section className={styles.summary} aria-label="Loaded track">
      {/* The track name leads; the file name follows it, or is the heading when unnamed. */}
      <div className={styles.header}>
        <h2 className={styles.title}>{track.name || fileName}</h2>
        {track.name && <p className={styles.fileName}>{fileName}</p>}
      </div>
      <dl className={styles.details}>
        {stats.map(
          ([label, value]) =>
            value !== null && (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ),
        )}
      </dl>
      {badges.length > 0 && (
        <ul className={styles.badges} aria-label="Available data">
          {badges.map((k) => (
            <li key={k} className={styles.badge}>
              {FIELD_LABELS[k]}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
