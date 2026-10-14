import L from 'leaflet'
import { useEffect, type RefObject } from 'react'
import type { Track } from '../../model/index.ts'
import { useViewStore, type PointRange } from '../view/index.ts'
import { createSelectionLayers, DIMMED_OPACITY } from './selectionLayers.ts'

/**
 * Shows the shared selection on the map: the selected stretch in a contrasting color above the
 * track, with the base track lines (`baseLines`, read when the selection changes) dimmed. The
 * start/finish markers and the map view are left alone.
 */
export function useSelectionOverlay(
  map: L.Map | null,
  track: Track,
  baseLines: RefObject<L.Polyline[]>,
) {
  const store = useViewStore()

  useEffect(() => {
    if (!map) return
    // One SVG renderer for every highlight on this map.
    const renderer = L.svg()
    let shown: PointRange | null = null
    let overlay: L.LayerGroup | null = null

    const dim = (on: boolean) => {
      for (const line of baseLines.current) line.setStyle({ opacity: on ? DIMMED_OPACITY : 1 })
    }

    const follow = () => {
      const { selection } = store.getState()
      if (selection === shown) return
      overlay?.remove()
      overlay = selection && createSelectionLayers(track, selection, renderer).addTo(map)
      if ((shown === null) !== (selection === null)) dim(selection !== null)
      shown = selection
    }

    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      overlay?.remove()
      if (shown) dim(false)
    }
  }, [map, track, store, baseLines])
}
