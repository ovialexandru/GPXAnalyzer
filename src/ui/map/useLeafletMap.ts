import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFitControl } from './FitControl.ts'
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './trackLayers.ts'

/** Touch screen as the primary pointer: one finger then scrolls the page, two move the map. */
function isCoarsePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
}

/**
 * Creates one Leaflet map when the returned `containerRef` is attached and removes it on detach
 * (a React 19 callback ref with cleanup, so StrictMode's double mount is safe).
 * `onFit` is called with the map when the "Fit to track" control is clicked.
 */
export function useLeafletMap(onFit: (map: L.Map) => void) {
  const [map, setMap] = useState<L.Map | null>(null)
  const onFitRef = useRef(onFit)
  useEffect(() => {
    onFitRef.current = onFit
  }, [onFit])

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    // Without one-finger dragging Leaflet sets `touch-action: pan-x pan-y`, so the page can scroll;
    // touch zoom (on by default) still pinches and pans with two fingers.
    const m = L.map(node, { preferCanvas: true, dragging: !isCoarsePointer() })
    L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(m)
    // Leaflet ignores fitBounds while a zoom animation runs, so a click then waits for zoomend.
    let zooming = false
    m.on('zoomstart', () => (zooming = true)).on('zoomend', () => (zooming = false))
    const fit = () => onFitRef.current(m)
    createFitControl(() => (zooming ? m.once('zoomend', fit) : fit())).addTo(m)
    setMap(m)
    return () => {
      m.remove()
      setMap(null)
    }
  }, [])

  return { containerRef, map }
}
