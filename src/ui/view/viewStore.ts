// Shared view state (hover now; zoom and selection in later phases), one store per loaded track.

export type HoverSource = 'map' | 'elevation' | 'speed'

export interface Hover {
  /** Point index into `track.points`. */
  index: number
  /** Who set it; that view handles its own feedback. */
  source: HoverSource
}

export interface ViewState {
  hover: Hover | null
}

export interface ViewStore {
  getState(): ViewState
  subscribe(listener: () => void): () => void
  /** Coalesced: at most one notification per animation frame; the last value wins. */
  setHover(hover: Hover | null): void
}

function sameHover(a: Hover | null, b: Hover | null): boolean {
  return a === b || (a !== null && b !== null && a.index === b.index && a.source === b.source)
}

export function createViewStore(): ViewStore {
  let state: ViewState = { hover: null }
  const listeners = new Set<() => void>()
  let frame: number | null = null

  const notify = () => {
    frame = null
    for (const listener of [...listeners]) listener()
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
      state = { ...state, hover }
      frame ??= requestAnimationFrame(notify)
    },
  }
}
