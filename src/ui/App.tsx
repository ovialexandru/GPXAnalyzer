import { useEffect, useMemo, useState } from 'react'
import styles from './App.module.css'
import { ChartsPanel } from './charts/index.ts'
import type { XAxisMode } from './charts/xAxis.ts'
import { CompareStats, ComparisonProvider, getTrackEntries } from './compare/index.ts'
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
  const { tracks, loading } = upload
  // Metrics are computed once per track; the summary, map and charts share them.
  const entries = useMemo(() => getTrackEntries(tracks), [tracks])
  const [a, b] = entries
  const pointCount = useMemo(
    () => ({ a: a?.track.points.length, b: b?.track.points.length }),
    [a, b],
  )
  // The x-axis choice survives tracks without time; it applies again to the next timed tracks.
  const [chosenAxis, setChosenAxis] = useState<XAxisMode>('distance')

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
        <FileDropZone
          onFiles={upload.loadFiles}
          onCompare={a ? upload.compareWith : undefined}
          disabled={loading}
          compact={a !== undefined}
        />
        {!a && <EmptyState onSample={upload.loadSample} disabled={loading} />}
        <UploadStatus
          loadingName={upload.loadingName}
          notice={upload.notice}
          error={upload.error}
          onDismissError={upload.dismissError}
        />
        {a && (
          // A fresh view store per set of tracks; the map and charts stay mounted.
          <ViewStoreProvider resetKey={tracks} pointCount={pointCount}>
            <ComparisonProvider entries={entries} chosenMode={chosenAxis}>
              {b ? (
                <CompareStats onRemove={upload.removeTrack} />
              ) : (
                <TrackSummary loaded={a.loaded} metrics={a.metrics} />
              )}
              <TrackMap track={a.track} metrics={a.metrics} />
              <ChartsPanel
                track={a.track}
                metrics={a.metrics}
                chosenMode={chosenAxis}
                onChosenModeChange={setChosenAxis}
              />
            </ComparisonProvider>
          </ViewStoreProvider>
        )}
      </main>
    </UnitsProvider>
  )
}

export default App
