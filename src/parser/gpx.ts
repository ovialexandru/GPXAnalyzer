// GPX 1.0/1.1 text -> Track. Elements are matched by local name, so any namespace or prefix works.
import type { Track, TrackPoint } from '../model/index.ts'

export type GpxErrorCode = 'invalid-xml' | 'not-gpx' | 'no-points'

export interface GpxError {
  code: GpxErrorCode
  /** User-facing explanation. */
  message: string
}

export type ParseResult = { ok: true; track: Track } | { ok: false; error: GpxError }

const MESSAGES: Record<GpxErrorCode, string> = {
  'invalid-xml': 'This file is not valid XML. It may be damaged or not a GPX file.',
  'not-gpx': 'This file is XML but not GPX. Please choose a .gpx file.',
  'no-points': 'This GPX file contains no track points with a valid location.',
}

function fail(code: GpxErrorCode): ParseResult {
  return { ok: false, error: { code, message: MESSAGES[code] } }
}

/** Trimmed text as a finite number, else `undefined` (empty strings do not become 0). */
export function parseNumber(text: string | null | undefined): number | undefined {
  if (text == null) return undefined
  const trimmed = text.trim()
  if (trimmed === '') return undefined
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : undefined
}

/** ISO timestamp as epoch ms, else `undefined`. */
export function parseTime(text: string | null | undefined): number | undefined {
  if (text == null) return undefined
  const value = Date.parse(text.trim())
  return Number.isNaN(value) ? undefined : value
}

function children(parent: Element, localName: string): Element[] {
  const result: Element[] = []
  for (const child of parent.children) {
    if (child.localName === localName) result.push(child)
  }
  return result
}

function firstChild(parent: Element, localName: string): Element | undefined {
  for (const child of parent.children) {
    if (child.localName === localName) return child
  }
  return undefined
}

function nonNegative(value: number | undefined): number | undefined {
  return value !== undefined && value >= 0 ? value : undefined
}

/** HR and cadence from the first matching descendants of `extensions`, any prefix. */
function readSensors(extensions: Element): { hr?: number; cad?: number } {
  let hr: Element | undefined
  let cad: Element | undefined
  for (const el of extensions.getElementsByTagName('*')) {
    const name = el.localName
    if (!hr && (name === 'hr' || name === 'heartrate')) hr = el
    else if (!cad && (name === 'cad' || name === 'cadence')) cad = el
    if (hr && cad) break
  }
  return {
    hr: nonNegative(parseNumber(hr?.textContent)),
    cad: nonNegative(parseNumber(cad?.textContent)),
  }
}

function parsePoint(trkpt: Element): TrackPoint | undefined {
  const lat = parseNumber(trkpt.getAttribute('lat'))
  const lon = parseNumber(trkpt.getAttribute('lon'))
  if (lat === undefined || lon === undefined) return undefined
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return undefined

  const point: TrackPoint = { lat, lon }
  const ele = parseNumber(firstChild(trkpt, 'ele')?.textContent)
  if (ele !== undefined) point.ele = ele
  const time = parseTime(firstChild(trkpt, 'time')?.textContent)
  if (time !== undefined) point.time = time

  const extensions = firstChild(trkpt, 'extensions')
  if (extensions) {
    const { hr, cad } = readSensors(extensions)
    if (hr !== undefined) point.hr = hr
    if (cad !== undefined) point.cad = cad
  }
  return point
}

function readName(parent: Element | undefined): string | undefined {
  const name = parent && firstChild(parent, 'name')?.textContent?.trim()
  return name || undefined
}

export function parseGpx(text: string): ParseResult {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length > 0) return fail('invalid-xml')

  const root = doc.documentElement
  if (root.localName !== 'gpx') return fail('not-gpx')

  const tracks = children(root, 'trk')
  const points: TrackPoint[] = []
  const segmentStarts: number[] = []

  for (const trk of tracks) {
    for (const trkseg of children(trk, 'trkseg')) {
      const start = points.length
      for (const trkpt of children(trkseg, 'trkpt')) {
        const point = parsePoint(trkpt)
        if (point) points.push(point)
      }
      if (points.length > start) segmentStarts.push(start)
    }
  }

  if (points.length === 0) return fail('no-points')

  const track: Track = { points, segmentStarts }
  const name = readName(tracks[0]) ?? readName(firstChild(root, 'metadata'))
  if (name !== undefined) track.name = name
  return { ok: true, track }
}
