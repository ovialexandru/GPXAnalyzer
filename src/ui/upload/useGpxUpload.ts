import { useCallback, useRef, useState } from 'react'
import type { TrackId } from '../compare/trackIds.ts'
import { loadGpxFile, type LoadedTrack, type UploadError } from './loadGpxFile.ts'

/** An upload that failed, and which file it was. */
export interface UploadFailure extends UploadError {
  fileName: string
}

/** Most tracks shown at once: A, and B compared with it. */
export const MAX_TRACKS = 2

export interface GpxUpload {
  /** The loaded tracks: none, A, or A and B. */
  tracks: LoadedTrack[]
  error: UploadFailure | null
  /** Informational message, e.g. when extra files were ignored. */
  notice: string | null
  loading: boolean
  /** Name of the file(s) being read, while `loading`. */
  loadingName: string | null
  /** Starts over with these files: the first is A, the second (if any) B; more are ignored. */
  loadFiles: (files: FileList | File[]) => void
  /** Loads the bundled sample track like a picked file. */
  loadSample: () => void
  /** Loads a file as B next to the current A (replacing B if there is one). */
  compareWith: (file: File) => void
  /** Removes a track; removing A makes B the new A. */
  removeTrack: (id: TrackId) => void
  dismissError: () => void
}

export const SAMPLE_NAME = 'sample.gpx'

/** The bundled sample (`public/sample.gpx`) as a File; same origin, so nothing leaves the site. */
export async function fetchSample(): Promise<File> {
  const response = await fetch(`${import.meta.env.BASE_URL}${SAMPLE_NAME}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return new File([await response.text()], SAMPLE_NAME, { type: 'application/gpx+xml' })
}

/**
 * Holds the loaded tracks. A bad file never removes a loaded track; when one of two files fails, the
 * other loads alone. Only the latest request is applied.
 */
export function useGpxUpload(): GpxUpload {
  const [tracks, setTracks] = useState<LoadedTrack[]>([])
  const [error, setError] = useState<UploadFailure | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadingName, setLoadingName] = useState<string | null>(null)
  const latestRequest = useRef(0)

  const loadFiles = useCallback((files: FileList | File[]) => {
    const list = Array.from(files)
    if (list.length === 0) return
    const chosen = list.slice(0, MAX_TRACKS)
    const names = chosen.map((f) => f.name)
    const request = ++latestRequest.current

    setNotice(
      list.length > MAX_TRACKS
        ? `Only two files can be compared; loaded ${names.join(' and ')}.`
        : null,
    )
    setLoadingName(names.join(' and '))

    void Promise.all(chosen.map(loadGpxFile)).then((results) => {
      if (request !== latestRequest.current) return
      const loaded: LoadedTrack[] = []
      let failure: UploadFailure | null = null
      results.forEach((result, i) => {
        if (result.ok) loaded.push(result.loaded)
        else failure ??= { ...result.error, fileName: names[i] }
      })
      if (loaded.length > 0) setTracks(loaded)
      setError(failure)
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

  const compareWith = useCallback((file: File) => {
    const request = ++latestRequest.current
    setNotice(null)
    setLoadingName(file.name)
    void loadGpxFile(file).then((result) => {
      if (request !== latestRequest.current) return
      if (result.ok) {
        setTracks((current) => (current.length > 0 ? [current[0], result.loaded] : [result.loaded]))
        setError(null)
      } else {
        setError({ ...result.error, fileName: file.name })
      }
      setLoadingName(null)
    })
  }, [])

  const removeTrack = useCallback((id: TrackId) => {
    setTracks((current) => (id === 'a' ? current.slice(1) : current.slice(0, 1)))
  }, [])

  const dismissError = useCallback(() => setError(null), [])

  return {
    tracks,
    error,
    notice,
    loading: loadingName !== null,
    loadingName,
    loadFiles,
    loadSample,
    compareWith,
    removeTrack,
    dismissError,
  }
}
