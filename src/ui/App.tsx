import { useEffect, useMemo } from 'react'
import { getTrackMetrics } from '../metrics/index.ts'
import styles from './App.module.css'
import { ChartsPanel } from './charts/index.ts'
import { TrackMap } from './map/index.ts'
import { UnitsProvider, UnitsToggle } from './units/index.ts'
import {
  EmptyState,
  FileDropZone,
  TrackSummary,
  UploadStatus,
  useGpxUpload,
} from './upload/index.ts'
import { ViewStoreProvider } from './view/index.ts'

function preventDefault(e: Event) {
  e.preventDefault()
}

function App() {
  const upload = useGpxUpload()
  const { loaded, loading } = upload
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
    <UnitsProvider>
      <main className={styles.app}>
        <header className={styles.header}>
          <h1 className={styles.title}>GPX Analyzer</h1>
          <UnitsToggle />
        </header>
        <FileDropZone onFiles={upload.loadFiles} disabled={loading} compact={loaded !== null} />
        {!loaded && <EmptyState onSample={upload.loadSample} disabled={loading} />}
        <UploadStatus
          loadingName={upload.loadingName}
          notice={upload.notice}
          error={upload.error}
          onDismissError={upload.dismissError}
        />
        {loaded && metrics && (
          // A fresh view store per track; the map and charts stay mounted.
          <ViewStoreProvider resetKey={loaded} pointCount={loaded.track.points.length}>
            <TrackSummary loaded={loaded} metrics={metrics} />
            <TrackMap track={loaded.track} />
            <ChartsPanel track={loaded.track} metrics={metrics} />
          </ViewStoreProvider>
        )}
      </main>
    </UnitsProvider>
  )
}

export default App
