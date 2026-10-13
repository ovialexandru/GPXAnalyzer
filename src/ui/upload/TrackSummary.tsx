import { useMemo } from 'react'
import { getAvailableFields, type AvailableFields } from '../../metrics/index.ts'
import type { LoadedTrack } from './loadGpxFile.ts'
import styles from './TrackSummary.module.css'

const FIELD_LABELS: Record<keyof AvailableFields, string> = {
  ele: 'Elevation',
  time: 'Time',
  hr: 'Heart rate',
  cad: 'Cadence',
}

interface TrackSummaryProps {
  loaded: LoadedTrack
}

/** File name, point count, track name and which optional data the track has. */
export function TrackSummary({ loaded }: TrackSummaryProps) {
  const { fileName, track } = loaded
  const fields = useMemo(() => getAvailableFields(track), [track])
  const badges = (Object.keys(FIELD_LABELS) as (keyof AvailableFields)[]).filter((k) => fields[k])

  return (
    <section className={styles.summary} aria-label="Loaded track">
      <h2 className={styles.fileName}>{fileName}</h2>
      <dl className={styles.details}>
        {track.name && (
          <div>
            <dt>Track</dt>
            <dd>{track.name}</dd>
          </div>
        )}
        <div>
          <dt>Points</dt>
          <dd>{track.points.length.toLocaleString()}</dd>
        </div>
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
