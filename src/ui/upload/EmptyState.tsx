import styles from './EmptyState.module.css'

interface EmptyStateProps {
  onSample: () => void
  disabled?: boolean
}

/** Shown before the first track: what the app does, the privacy promise, and a sample to try. */
export function EmptyState({ onSample, disabled = false }: EmptyStateProps) {
  return (
    <section className={styles.intro} aria-label="Getting started">
      <p className={styles.text}>
        See a GPS track on a map with linked elevation, speed, heart rate and cadence charts, then
        select any stretch for its stats.
      </p>
      <p className={styles.privacy}>Your file is read on this device and never uploaded.</p>
      <button type="button" className={styles.button} disabled={disabled} onClick={onSample}>
        Try a sample track
      </button>
    </section>
  )
}
