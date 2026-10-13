// File -> Track, with checks before reading. Pure of React so it can be unit-tested directly.
import type { Track } from '../../model/index.ts'
import { parseGpx, type GpxErrorCode } from '../../parser/index.ts'

export type UploadErrorCode =
  'wrong-extension' | 'empty-file' | 'too-large' | 'read-failed' | GpxErrorCode

export interface UploadError {
  code: UploadErrorCode
  /** User-facing explanation. */
  message: string
}

export interface LoadedTrack {
  fileName: string
  track: Track
}

export type LoadResult = { ok: true; loaded: LoadedTrack } | { ok: false; error: UploadError }

export const MAX_FILE_BYTES = 50 * 1024 * 1024

const MESSAGES: Record<Exclude<UploadErrorCode, GpxErrorCode>, string> = {
  'wrong-extension': 'Please choose a .gpx file.',
  'empty-file': 'This file is empty.',
  'too-large': 'This file is larger than 50 MB.',
  'read-failed': 'The file could not be read.',
}

function fail(code: keyof typeof MESSAGES): LoadResult {
  return { ok: false, error: { code, message: MESSAGES[code] } }
}

export async function loadGpxFile(file: File): Promise<LoadResult> {
  if (!file.name.toLowerCase().endsWith('.gpx')) return fail('wrong-extension')
  if (file.size === 0) return fail('empty-file')
  if (file.size > MAX_FILE_BYTES) return fail('too-large')

  let text: string
  try {
    text = await file.text()
  } catch {
    return fail('read-failed')
  }

  const result = parseGpx(text)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, loaded: { fileName: file.name, track: result.track } }
}
