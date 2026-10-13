import { useCallback, useRef, useState } from 'react'
import { loadGpxFile, type LoadedTrack, type UploadError } from './loadGpxFile.ts'

export interface GpxUpload {
  loaded: LoadedTrack | null
  error: UploadError | null
  /** Informational message, e.g. when extra files were ignored. */
  notice: string | null
  loading: boolean
  loadFiles: (files: FileList | File[]) => void
}

/** Holds the loaded track. A bad file keeps the previous track; only the latest request is applied. */
export function useGpxUpload(): GpxUpload {
  const [loaded, setLoaded] = useState<LoadedTrack | null>(null)
  const [error, setError] = useState<UploadError | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const latestRequest = useRef(0)

  const loadFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const file = list[0]
    const request = ++latestRequest.current

    setNotice(list.length > 1 ? `Only one file at a time is supported; loaded ${file.name}.` : null)
    setLoading(true)

    void loadGpxFile(file).then((result) => {
      if (request !== latestRequest.current) return
      if (result.ok) {
        setLoaded(result.loaded)
        setError(null)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
  }, [])

  return { loaded, error, notice, loading, loadFiles }
}
