import { useCallback, useRef, useState } from 'react'
import { loadGpxFile, type LoadedTrack, type UploadError } from './loadGpxFile.ts'

/** An upload that failed, and which file it was. */
export interface UploadFailure extends UploadError {
  fileName: string
}

export interface GpxUpload {
  loaded: LoadedTrack | null
  error: UploadFailure | null
  /** Informational message, e.g. when extra files were ignored. */
  notice: string | null
  loading: boolean
  /** Name of the file being read, while `loading`. */
  loadingName: string | null
  loadFiles: (files: FileList | File[]) => void
  /** Loads the bundled sample track like a picked file. */
  loadSample: () => void
  dismissError: () => void
}

export const SAMPLE_NAME = 'sample.gpx'

/** The bundled sample (`public/sample.gpx`) as a File; same origin, so nothing leaves the site. */
export async function fetchSample(): Promise<File> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SAMPLE_NAME}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return new File([await response.text()], SAMPLE_NAME, { type: 'application/gpx+xml' })
}

/** Holds the loaded track. A bad file keeps the previous track; only the latest request is applied. */
export function useGpxUpload(): GpxUpload {
  const [loaded, setLoaded] = useState<LoadedTrack | null>(null)
  const [error, setError] = useState<UploadFailure | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const loadFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const file = list[0]
    const request = ++latestRequest.current

    setNotice(list.length > 1 ? `Only one file at a time is supported; loaded ${file.name}.` : null)
    setLoadingName(file.name)

    void loadGpxFile(file).then((result) => {
      if (request !== latestRequest.current) return
      if (result.ok) {
        setLoaded(result.loaded)
        setError(null)
      } else {
        setError({ ...result.error, fileName: file.name })
      }
      setLoadingName(null)
    })
  }, [])

  const loadSample = useCallback(() => {
    const request = ++latestRequest.current
    setNotice(null)
    setLoadingName(SAMPLE_NAME)
    fetchSample().then(
      (file) => {
        if (request === latestRequest.current) loadFiles([file])
      },
      () => {
        if (request !== latestRequest.current) return
        setError({
          code: 'read-failed',
          message: 'The sample track could not be loaded.',
          fileName: SAMPLE_NAME,
        })
        setLoadingName(null)
      },
    )
  }, [loadFiles])

  const dismissError = useCallback(() => setError(null), [])

  return {
    loaded,
    error,
    notice,
    loading: loadingName !== null,
    loadingName,
    loadFiles,
    loadSample,
    dismissError,
  }
}
