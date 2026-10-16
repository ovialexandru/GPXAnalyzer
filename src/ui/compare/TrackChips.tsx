import styles from './CompareStats.module.css'
import { TRACK_LETTERS, type TrackEntry, type TrackId } from './trackIds.ts'

interface TrackChipsProps {
  entries: readonly TrackEntry[]
  onRemove: (id: TrackId) => void
}

/** One chip per compared track: its color, letter and name, and a button removing it. */
export function TrackChips({ entries, onRemove }: TrackChipsProps) {
  return (
    <ul className={styles.chips} aria-label="Tracks">
      {entries.map((e) => (
        <li key={e.id} className={styles.chip}>
          <span className={styles.swatch} style={{ background: e.color }} aria-hidden="true" />
          <span className={styles.letter}>{TRACK_LETTERS[e.id]}</span>
          <span className={styles.name} title={e.loaded.fileName}>
            {e.name}
          </span>
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${e.name}`}
            title={`Remove ${e.name}`}
            onClick={() => onRemove(e.id)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
