import type { UploadFailure } from './useGpxUpload.ts'
import styles from './UploadStatus.module.css'

interface UploadStatusProps {
  loadingName: string | null
  notice: string | null
  error: UploadFailure | null
  onDismissError: () => void
}

/** Live status (reading, notices) and the error alert for the latest upload. */
export function UploadStatus({ loadingName, notice, error, onDismissError }: UploadStatusProps) {
  return (
    <>
      <div role="status" className={styles.status}>
        {loadingName && (
          <p className={styles.loading}>
            <span className={styles.spinner} aria-hidden="true" />
            Reading {loadingName}…
          </p>
        )}
        {notice && <p>{notice}</p>}
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          <div className={styles.errorText}>
            <p className={styles.errorTitle}>Couldn't open {error.fileName}</p>
            <p>{error.message}</p>
          </div>
          <button type="button" className={styles.dismiss} onClick={onDismissError}>
            Dismiss
          </button>
        </div>
      )}
    </>
  )
}
