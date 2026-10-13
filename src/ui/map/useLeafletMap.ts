import L from 'leaflet'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createFitControl } from './FitControl.ts'
import { TILE_ATTRIBUTION, TILE_MAX_ZOOM, TILE_URL } from './trackLayers.ts'

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
    const m = L.map(node, { preferCanvas: true })
    L.tileLayer(TILE_URL, { maxZoom: TILE_MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(m)
    L.control.scale({ metric: true, imperial: false }).addTo(m)
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
