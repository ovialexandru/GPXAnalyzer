import L from 'leaflet'
import { useEffect } from 'react'
import type { Track } from '../../model/index.ts'
import { useViewStore } from '../view/index.ts'
import styles from './TrackMap.module.css'

const MARKER_SIZE = 14

/** The hover marker: a DOM dot drawn above the canvas track, ignoring the mouse. */
export function createHoverMarker(latlng: L.LatLngExpression): L.Marker {
  const icon = L.divIcon({
    className: styles.hoverIcon,
    html: `<span class="${styles.hoverDot}" data-hover-marker></span>`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
  })
  return L.marker(latlng, { icon, interactive: false, keyboard: false })
}

/** Shows the shared hover as a marker on the map: created once, then moved or removed. */
export function useHoverMarker(map: L.Map | null, track: Track) {
  const store = useViewStore()

  useEffect(() => {
    if (!map) return
    let marker: L.Marker | null = null
    let shown = false

    const follow = () => {
      const { hover } = store.getState()
      const point = hover && track.points[hover.index]
      if (!point) {
        if (shown) marker?.remove()
        shown = false
        return
      }
      const latlng: L.LatLngTuple = [point.lat, point.lon]
      if (!marker) marker = createHoverMarker(latlng)
      else marker.setLatLng(latlng)
      if (!shown) marker.addTo(map)
      shown = true
    }

    const unsubscribe = store.subscribe(follow)
    follow()
    return () => {
      unsubscribe()
      marker?.remove()
    }
  }, [map, track, store])
}
