import { useEffect, useMemo } from 'react'
import { getTrackMetrics } from '../metrics/index.ts'
import styles from './App.module.css'
import { ChartsPanel } from './charts/index.ts'
import { TrackMap } from './map/index.ts'
import { FileDropZone, TrackSummary, useGpxUpload } from './upload/index.ts'
import { ViewStoreProvider } from './view/index.ts'

function preventDefault(e: Event) {
  e.preventDefault()
}

function App() {
  const { loaded, error, notice, loading, loadFiles } = useGpxUpload()
  // Computed once per track; the summary and the charts share it.
  const metrics = useMemo(() => loaded && getTrackMetrics(loaded.track), [loaded])

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
      {loaded && metrics && (
        // A fresh view store per track; the map and charts stay mounted.
        <ViewStoreProvider resetKey={loaded}>
          <TrackSummary loaded={loaded} totals={metrics.totals} />
          <TrackMap track={loaded.track} />
          <ChartsPanel track={loaded.track} metrics={metrics} />
        </ViewStoreProvider>
      )}
    </main>
  )
}

export default App
