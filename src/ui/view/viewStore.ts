// Shared view state (hover, zoom and selection), one store per loaded track.

export type HoverSource = 'map' | 'elevation' | 'speed'

export interface Hover {
  /** Point index into `track.points`. */
  index: number
  /** Who set it; that view handles its own feedback. */
  source: HoverSource
}

/** Inclusive point indices [first, last]. */
export type PointRange = [first: number, last: number]

export interface ViewState {
  hover: Hover | null
  /** Points in the charts' visible window; null = whole track. */
  zoom: PointRange | null
  /** Selected points, at least 2; null = nothing selected. */
  selection: PointRange | null
}

export interface ViewStore {
  getState(): ViewState
  subscribe(listener: () => void): () => void
  /** Coalesced: at most one notification per animation frame; the last value wins. */
  setHover(hover: Hover | null): void
  /** Coalesced like `setHover`. A range covering the whole track is stored as null. */
  setZoom(zoom: PointRange | null): void
  /** Coalesced like `setHover`. A range of fewer than 2 points is stored as null. */
  setSelection(selection: PointRange | null): void
}

function sameHover(a: Hover | null, b: Hover | null): boolean {
  return a === b || (a !== null && b !== null && a.index === b.index && a.source === b.source)
}

function sameRange(a: PointRange | null, b: PointRange | null): boolean {
  return a === b || (a !== null && b !== null && a[0] === b[0] && a[1] === b[1])
}

/** `pointCount` lets `setZoom` recognise the whole track; without it no range is normalised. */
export function createViewStore(pointCount?: number): ViewStore {
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

  const isWholeTrack = ([first, last]: PointRange) =>
    pointCount !== undefined && first <= 0 && last >= pointCount - 1

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
      update({ hover })
    },
    setZoom(zoom) {
      const normalised = zoom && isWholeTrack(zoom) ? null : zoom
      if (sameRange(state.zoom, normalised)) return
      update({ zoom: normalised })
    },
    setSelection(selection) {
      const normalised = selection && selection[1] > selection[0] ? selection : null
      if (sameRange(state.selection, normalised)) return
      update({ selection: normalised })
    },
  }
}
