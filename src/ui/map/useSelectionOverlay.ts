import L from 'leaflet'
import { useEffect, type RefObject } from 'react'
import type { Track } from '../../model/index.ts'
import { useViewStore, type PointRange, type TrackId } from '../view/index.ts'
import { createSelectionLayers, DIMMED_OPACITY } from './selectionLayers.ts'
import type { SpeedColoring } from './speedColors.ts'

/** A track on the map, and how its part of the selection is drawn. */
export interface OverlayTrack {
  id: TrackId
  track: Track
  /** Draw the selected stretch in its speed colors. */
  coloring: SpeedColoring | null
  /** Draw it in this color (a compared track's own) instead of orange. */
  color?: string
}

/** The points of track `id` under a selection stored on `selectionTrack` (absent means A). */
export type RangeOn = (
  selection: PointRange,
  selectionTrack: TrackId | undefined,
  id: TrackId,
) => PointRange | null

const sameTrackOnly: RangeOn = (selection, selectionTrack, id) =>
  (selectionTrack ?? 'a') === id ? selection : null

/**
 * Shows the shared selection on the map: each track's selected stretch above it (in orange, in its
 * speed colors, or in the track's own color), with all base track lines (`baseLines`, read when the
 * selection or the tracks change) dimmed. The start/finish markers and the map view are left alone.
 */
export function useSelectionOverlay(
  map: L.Map | null,
  tracks: readonly OverlayTrack[],
  baseLines: RefObject<L.Polyline[]>,
  rangeOn: RangeOn = sameTrackOnly,
) {
  const store = useViewStore()

  useEffect(() => {
    if (!map) return
    // One SVG renderer for every highlight on this map.
    const renderer = L.svg()
    let shown: PointRange | null = null
    let shownTrack: TrackId | undefined
    let overlays: L.LayerGroup[] = []

    const dim = (on: boolean) => {
      for (const line of baseLines.current) line.setStyle({ opacity: on ? DIMMED_OPACITY : 1 })
    }

    const follow = () => {
      const { selection, selectionTrack } = store.getState()
      if (selection === shown && selectionTrack === shownTrack) return
      for (const overlay of overlays) overlay.remove()
      overlays = []
      if (selection) {
        for (const { id, track, coloring, color } of tracks) {
          const range = rangeOn(selection, selectionTrack, id)
          if (!range) continue
          overlays.push(createSelectionLayers(track, range, renderer, coloring, color).addTo(map))
        }
      }
      if ((shown === null) !== (selection === null)) dim(selection !== null)
      shown = selection
      shownTrack = selectionTrack
    }

    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      for (const overlay of overlays) overlay.remove()
      if (shown) dim(false)
    }
  }, [map, tracks, store, baseLines, rangeOn])
}
