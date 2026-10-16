import L from 'leaflet'
import { useEffect } from 'react'
import type { Track } from '../../model/index.ts'
import { useViewStore, type Hover, type TrackId } from '../view/index.ts'
import styles from './TrackMap.module.css'

const MARKER_SIZE = 14

/** The hover marker: a DOM dot drawn above the canvas track, ignoring the mouse. `color` overrides its fill. */
export function createHoverMarker(latlng: L.LatLngExpression, color?: string): L.Marker {
  const style = color ? ` style="background: ${color}"` : ''
  const icon = L.divIcon({
    className: styles.hoverIcon,
    html: `<span class="${styles.hoverDot}"${style} data-hover-marker></span>`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
  })
  return L.marker(latlng, { icon, interactive: false, keyboard: false })
}

/** A track that shows the hover, and the color of its marker (default amber). */
export interface HoverTrack {
  id: TrackId
  track: Track
  color?: string
}

/** The hovered point on track `id`, or null when it has none there. */
export type PointOn = (hover: Hover, id: TrackId) => number | null

const ownTrackOnly: PointOn = (hover, id) => ((hover.track ?? 'a') === id ? hover.index : null)

/**
 * Shows the shared hover as a marker on each track: the hovered point, or the point at the same
 * position (`pointOn`). Markers are created once, then moved or removed.
 */
export function useHoverMarker(
  map: L.Map | null,
  tracks: readonly HoverTrack[],
  pointOn: PointOn = ownTrackOnly,
) {
  const store = useViewStore()

  useEffect(() => {
    if (!map) return
    const markers = tracks.map(() => ({ marker: null as L.Marker | null, shown: false }))

    const follow = () => {
      const { hover } = store.getState()
      tracks.forEach(({ id, track, color }, i) => {
        const m = markers[i]
        const index = hover && pointOn(hover, id)
        const point = index === null ? undefined : track.points[index]
        if (!point) {
          if (m.shown) m.marker?.remove()
          m.shown = false
          return
        }
        const latlng: L.LatLngTuple = [point.lat, point.lon]
        if (!m.marker) m.marker = createHoverMarker(latlng, color)
        else m.marker.setLatLng(latlng)
        if (!m.shown) m.marker.addTo(map)
        m.shown = true
      })
    }

    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      for (const { marker } of markers) marker?.remove()
    }
  }, [map, tracks, store, pointOn])
}
