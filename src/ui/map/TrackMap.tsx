import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getSpeedSeries,
  getTrackBounds,
  type TrackBounds,
  type TrackMetrics,
} from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { SPEED_COLORS } from '../../settings.ts'
import { useUnits } from '../units/index.ts'
import { useHoverMarker } from './hoverMarker.ts'
import { SpeedLegend } from './SpeedLegend.tsx'
import type { SpeedColoring } from './speedColors.ts'
import { loadTrackColor, saveTrackColor, type TrackColor } from './trackColor.ts'
import { TrackColorToggle } from './TrackColorToggle.tsx'
import { createTrackLayers, fitTrack } from './trackLayers.ts'
import styles from './TrackMap.module.css'
import { useLeafletMap } from './useLeafletMap.ts'
import { useMapHover } from './useMapHover.ts'
import { useSelectionOverlay } from './useSelectionOverlay.ts'

interface TrackMapProps {
  track: Track
  /** The track's metrics: distance and time for the coloring speed, and the average speed. */
  metrics: TrackMetrics
}

/**
 * OSM map showing the track's segments (plain or colored by speed, with a toggle and a legend),
 * start/end markers, the shared hover and selection, fitted to the track.
 */
export function TrackMap({ track, metrics }: TrackMapProps) {
  // Latest track bounds, read by the "Fit to track" control.
  const boundsRef = useRef<TrackBounds | null>(null)
  // The current track's lines, dimmed while a selection is shown.
  const linesRef = useRef<L.Polyline[]>([])
  const fit = useCallback((map: L.Map) => fitTrack(map, boundsRef.current), [])
  const { containerRef, map } = useLeafletMap(fit)

  // The saved choice; a track without average speed is drawn plain but keeps the choice.
  const [trackColor, setTrackColor] = useState(loadTrackColor)
  const changeTrackColor = (next: TrackColor) => {
    setTrackColor(next)
    saveTrackColor(next)
  }
  const avg = metrics.totals.avgSpeed
  const canColor = avg !== null && avg > 0
  const shown: TrackColor = canColor ? trackColor : 'plain'
  const coloring = useMemo((): SpeedColoring | null => {
    if (shown !== 'speed' || avg === null) return null
    const { distance, elapsed } = metrics
    const speed = getSpeedSeries(track, distance, elapsed, SPEED_COLORS.smoothingSeconds)
    return { speed, avg, settings: SPEED_COLORS }
  }, [shown, track, metrics, avg])

  // Same map instance across tracks: re-fit when the track changes.
  useEffect(() => {
    if (!map) return
    boundsRef.current = getTrackBounds(track)
    fitTrack(map, boundsRef.current)
  }, [map, track])

  // Swap the layer group for a new track or coloring, without moving the map.
  useEffect(() => {
    if (!map) return
    const { group, lines } = createTrackLayers(track, coloring)
    group.addTo(map)
    linesRef.current = lines
    return () => {
      group.remove()
    }
  }, [map, track, coloring])

  // Scale bar in the chosen units, swapped when they change.
  const [units] = useUnits()
  useEffect(() => {
    if (!map) return
    const scale = L.control
      .scale({ metric: units === 'metric', imperial: units === 'imperial' })
      .addTo(map)
    return () => {
      scale.remove()
    }
  }, [map, units])

  // After the effect above, so it sees the new track's lines.
  useSelectionOverlay(map, track, linesRef, coloring)
  useMapHover(map, track)
  useHoverMarker(map, track)

  return (
    <>
      <div className={styles.toolbar}>
        <TrackColorToggle value={shown} onChange={changeTrackColor} canColor={canColor} />
      </div>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Track map" />
      {/* Shown on touch screens only (CSS), where one finger scrolls the page. */}
      <p className={styles.touchHint}>Use two fingers to move or zoom the map.</p>
      {coloring && <SpeedLegend avg={coloring.avg} settings={coloring.settings} />}
    </>
  )
}
