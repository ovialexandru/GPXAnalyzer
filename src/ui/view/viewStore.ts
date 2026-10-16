// Shared view state (hover, zoom and selection), one store per loaded track.
import type { PointRange } from '../../metrics/index.ts'
import type { TrackId } from '../compare/trackIds.ts'

export type { PointRange, TrackId }

export type HoverSource = 'map' | 'elevation' | 'speed' | 'heartRate' | 'cadence'

export interface Hover {
  /** Point index into `track.points`. */
  index: number
  /** Who set it; that view handles its own feedback. */
  source: HoverSource
  /** The track `index` refers to; absent means A (always, with one track). */
  track?: TrackId
}

export interface ViewState {
  hover: Hover | null
  /** Points in the charts' visible window; null = whole track. */
  zoom: PointRange | null
  /** The track `zoom` refers to; absent means A. */
  zoomTrack?: TrackId
  /** Selected points, at least 2; null = nothing selected. */
  selection: PointRange | null
  /** The track `selection` refers to; absent means A. */
  selectionTrack?: TrackId
}

export interface ViewStore {
  getState(): ViewState
  subscribe(listener: () => void): () => void
  /** Coalesced: at most one notification per animation frame; the last value wins. */
  setHover(hover: Hover | null): void
  /**
   * Coalesced like `setHover`. A range covering the whole of its track is stored as null.
   * `track` is the track the range's points refer to (absent means A).
   */
  setZoom(zoom: PointRange | null, track?: TrackId): void
  /** Coalesced like `setHover`. A range of fewer than 2 points is stored as null. `track` as for `setZoom`. */
  setSelection(selection: PointRange | null, track?: TrackId): void
}

/** Point counts per track, or one count for track A. */
export type PointCounts = number | Partial<Record<TrackId, number>>

function sameHover(a: Hover | null, b: Hover | null): boolean {
  return (
    a === b ||
    (a !== null &&
      b !== null &&
      a.index === b.index &&
      a.source === b.source &&
      (a.track ?? 'a') === (b.track ?? 'a'))
  )
}

/** A is stored as absent, so each state has one form. */
function onlyB(track: TrackId | undefined): TrackId | undefined {
  return track === 'b' ? track : undefined
}

function sameRange(a: PointRange | null, b: PointRange | null): boolean {
  return a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1])
}

/** `pointCount` lets `setZoom` recognise a whole track; without it no range is normalised. */
export function createViewStore(pointCount?: PointCounts): ViewStore {
  let state: ViewState = { hover: null, zoom: null, selection: null }
  const listeners = new Set<() => void>()
  let frame: number | null = null

  const notify = () => {
    frame = null
    for (const listener of [...listeners]) listener()
  }

  const update = (next: Partial<ViewState>) => {
    state = { ...state, ...next }
    frame ??= requestAnimationFrame(notify)
  }

  const countOf = (track: TrackId) =>
    typeof pointCount === 'number' ? (track === 'a' ? pointCount : undefined) : pointCount?.[track]
  const isWholeTrack = ([first, last]: PointRange, track: TrackId) => {
    const count = countOf(track)
    return count !== undefined && first <= 0 && last >= count - 1
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    setHover(hover) {
      if (sameHover(state.hover, hover)) return
      update({
        hover: hover && hover.track === 'a' ? { index: hover.index, source: hover.source } : hover,
      })
    },
    setZoom(zoom, track) {
      const normalised = zoom && isWholeTrack(zoom, track ?? 'a') ? null : zoom
      const zoomTrack = normalised ? onlyB(track) : undefined
      if (sameRange(state.zoom, normalised) && state.zoomTrack === zoomTrack) return
      update({ zoom: normalised, zoomTrack })
    },
    setSelection(selection, track) {
      const normalised = selection && selection[1] > selection[0] ? selection : null
      const selectionTrack = normalised ? onlyB(track) : undefined
      if (sameRange(state.selection, normalised) && state.selectionTrack === selectionTrack) return
      update({ selection: normalised, selectionTrack })
    },
  }
}
