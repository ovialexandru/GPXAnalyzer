import { useMemo } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import { formatDistance } from '../format.ts'
import { useUnits } from '../units/index.ts'
import { useDisplayedStats, useViewStore } from '../view/index.ts'
import type { LoadedTrack } from './loadGpxFile.ts'
import { fieldBadges, statRows } from './statRows.ts'
import styles from './TrackSummary.module.css'

interface TrackSummaryProps {
  loaded: LoadedTrack
  metrics: TrackMetrics
}

/**
 * Track name and file name, stats for the selection (or the whole track when nothing is
 * selected), and which optional data the track has.
 */
export function TrackSummary({ loaded, metrics }: TrackSummaryProps) {
  const { fileName, track } = loaded
  const store = useViewStore()
  const [units] = useUnits()
  const { totals, selection } = useDisplayedStats(track, metrics)
  const badges = useMemo(() => fieldBadges(getAvailableFields(track)), [track])
  // Totals that are null (no time / no elevation) are left out.
  const stats = statRows(totals, units)

  return (
    <section className={styles.summary} aria-label="Loaded track">
      {/* The track name leads; the file name follows it, or is the heading when unnamed. */}
      <div className={styles.header}>
        <h2 className={styles.title}>{track.name || fileName}</h2>
        {track.name && <p className={styles.fileName}>{fileName}</p>}
      </div>
      {selection && (
        <div className={styles.selection}>
          <p className={styles.selectionText}>
            Selection · {formatDistance(metrics.distance[selection[0]], units)} –{' '}
            {formatDistance(metrics.distance[selection[1]], units)}
          </p>
          <button
            type="button"
            className={styles.wholeTrack}
            onClick={() => store.setSelection(null)}
          >
            Show whole track
          </button>
        </div>
      )}
      {/* Not aria-live: a brush drag would flood screen readers. */}
      <dl
        className={styles.details}
        aria-label={selection ? 'Selection stats' : 'Whole-track stats'}
      >
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
          {badges.map((label) => (
            <li key={label} className={styles.badge}>
              {label}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
