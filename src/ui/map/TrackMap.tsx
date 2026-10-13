import 'leaflet/dist/leaflet.css'
import type L from 'leaflet'
import { useCallback, useEffect, useRef } from 'react'
import { getTrackBounds, type TrackBounds } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { createTrackLayers, fitTrack } from './trackLayers.ts'
import styles from './TrackMap.module.css'
import { useLeafletMap } from './useLeafletMap.ts'

interface TrackMapProps {
  track: Track
}

/** OSM map showing the track's segments and start/end markers, fitted to the track. */
export function TrackMap({ track }: TrackMapProps) {
  // Latest track bounds, read by the "Fit to track" control.
  const boundsRef = useRef<TrackBounds | null>(null)
  const fit = useCallback((map: L.Map) => fitTrack(map, boundsRef.current), [])
  const { containerRef, map } = useLeafletMap(fit)

  // Same map instance across tracks: swap the layer group and re-fit.
  useEffect(() => {
    if (!map) return
    boundsRef.current = getTrackBounds(track)
    const layers = createTrackLayers(track).addTo(map)
    fitTrack(map, boundsRef.current)
    return () => {
      layers.remove()
    }
  }, [map, track])

  return <div ref={containerRef} className={styles.map} role="region" aria-label="Track map" />
}
