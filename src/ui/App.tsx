import { useEffect } from 'react'
import styles from './App.module.css'
import { FileDropZone, TrackSummary, useGpxUpload } from './upload/index.ts'

function preventDefault(e: Event) {
  e.preventDefault()
}

function App() {
  const { loaded, error, notice, loading, loadFiles } = useGpxUpload()

  // A file dropped outside the drop zone would otherwise be opened by the browser, replacing the app.
  useEffect(() => {
    window.addEventListener('dragover', preventDefault)
    window.addEventListener('drop', preventDefault)
    return () => {
      window.removeEventListener('dragover', preventDefault)
      window.removeEventListener('drop', preventDefault)
    }
  }, [])

  return (
    <main className={styles.app}>
      <h1 className={styles.title}>GPX Analyzer</h1>
      <FileDropZone onFiles={loadFiles} />
      <div role="status" className={styles.status}>
        {loading && <p>Reading file…</p>}
        {notice && <p>{notice}</p>}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error.message}
        </p>
      )}
      {loaded && <TrackSummary loaded={loaded} />}
    </main>
  )
}

export default App
