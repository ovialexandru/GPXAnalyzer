import 'leaflet/dist/leaflet.css'
import type L from 'leaflet'
import { useCallback, useEffect, useRef } from 'react'
import { getTrackBounds, type TrackBounds } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useHoverMarker } from './hoverMarker.ts'
import { createTrackLayers, fitTrack } from './trackLayers.ts'
import styles from './TrackMap.module.css'
import { useLeafletMap } from './useLeafletMap.ts'
import { useMapHover } from './useMapHover.ts'
import { useSelectionOverlay } from './useSelectionOverlay.ts'

interface TrackMapProps {
  track: Track
}

/**
 * OSM map showing the track's segments, start/end markers, the shared hover and selection, fitted
 * to the track.
 */
export function TrackMap({ track }: TrackMapProps) {
  // Latest track bounds, read by the "Fit to track" control.
  const boundsRef = useRef<TrackBounds | null>(null)
  // The current track's lines, dimmed while a selection is shown.
  const linesRef = useRef<L.Polyline[]>([])
  const fit = useCallback((map: L.Map) => fitTrack(map, boundsRef.current), [])
  const { containerRef, map } = useLeafletMap(fit)

  // Same map instance across tracks: swap the layer group and re-fit.
  useEffect(() => {
    if (!map) return
    boundsRef.current = getTrackBounds(track)
    const { group, lines } = createTrackLayers(track)
    group.addTo(map)
    linesRef.current = lines
    fitTrack(map, boundsRef.current)
    return () => {
      group.remove()
    }
  }, [map, track])

  // After the effect above, so it sees the new track's lines.
  useSelectionOverlay(map, track, linesRef)
  useMapHover(map, track)
  useHoverMarker(map, track)

  return <div ref={containerRef} className={styles.map} role="region" aria-label="Track map" />
}
