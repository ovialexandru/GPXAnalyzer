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
import { useComparison } from '../compare/ComparisonContext.tsx'
import { TRACK_COLORS } from '../compare/trackIds.ts'
import { useUnits } from '../units/index.ts'
import { useHoverMarker, type HoverTrack } from './hoverMarker.ts'
import { SpeedLegend } from './SpeedLegend.tsx'
import type { SpeedColoring } from './speedColors.ts'
import { loadTrackColor, saveTrackColor, type TrackColor } from './trackColor.ts'
import { COMPARE_HINT, TrackColorToggle } from './TrackColorToggle.tsx'
import { combineBounds, createCompareLayers, createTrackLayers, fitTrack } from './trackLayers.ts'
import styles from './TrackMap.module.css'
import { useLeafletMap } from './useLeafletMap.ts'
import { useMapHover } from './useMapHover.ts'
import { useSelectionOverlay, type OverlayTrack } from './useSelectionOverlay.ts'

/** A track on the map: how it is drawn, highlighted and hovered. */
type MapTrack = OverlayTrack & HoverTrack

interface TrackMapProps {
  track: Track
  /** The track's metrics: distance and time for the coloring speed, and the average speed. */
  metrics: TrackMetrics
}

/**
 * OSM map showing the track's segments (plain or colored by speed, with a toggle and a legend),
 * start/end markers, the shared hover and selection, fitted to the track. While two tracks are
 * compared, both are drawn in their own colors, and the hover and selection show on each.
 */
export function TrackMap({ track, metrics }: TrackMapProps) {
  const comparison = useComparison()
  // The compared track B (A is `track`); undefined with one track.
  const [, compared] = comparison?.entries ?? []
  // Latest bounds of all tracks, read by the "Fit to track" control.
  const boundsRef = useRef<TrackBounds | null>(null)
  // All tracks' lines, dimmed while a selection is shown.
  const linesRef = useRef<L.Polyline[]>([])
  const fit = useCallback((map: L.Map) => fitTrack(map, boundsRef.current), [])
  const { containerRef, map } = useLeafletMap(fit)

  // The saved choice; a track without average speed, or a comparison, is drawn plain but keeps it.
  const [trackColor, setTrackColor] = useState(loadTrackColor)
  const changeTrackColor = (next: TrackColor) => {
    setTrackColor(next)
    saveTrackColor(next)
  }
  const avg = metrics.totals.avgSpeed
  const canColor = !compared && avg !== null && avg > 0
  const shown: TrackColor = canColor ? trackColor : 'plain'
  const coloring = useMemo((): SpeedColoring | null => {
    if (shown !== 'speed' || avg === null) return null
    const { distance, elapsed } = metrics
    const speed = getSpeedSeries(track, distance, elapsed, SPEED_COLORS.smoothingSeconds)
    return { speed, avg, settings: SPEED_COLORS }
  }, [shown, track, metrics, avg])

  // A, then B in their own colors; with one track, A in the plain (or speed) look.
  const comparedTrack = compared?.track
  const tracks = useMemo(
    (): MapTrack[] =>
      comparedTrack
        ? [
            { id: 'a', track, coloring: null, color: TRACK_COLORS.a },
            { id: 'b', track: comparedTrack, coloring: null, color: TRACK_COLORS.b },
          ]
        : [{ id: 'a', track, coloring }],
    [track, coloring, comparedTrack],
  )

  // Same map instance across tracks: re-fit when a track is loaded, added or removed.
  useEffect(() => {
    if (!map) return
    boundsRef.current = combineBounds([
      getTrackBounds(track),
      comparedTrack && getTrackBounds(comparedTrack),
    ])
    fitTrack(map, boundsRef.current)
  }, [map, track, comparedTrack])

  // Swap the layer group for new tracks or coloring, without moving the map.
  useEffect(() => {
    if (!map) return
    const { group, lines } =
      tracks.length > 1
        ? createCompareLayers(tracks)
        : createTrackLayers(tracks[0].track, tracks[0].coloring)
    group.addTo(map)
    linesRef.current = lines.flat()
    return () => {
      group.remove()
    }
  }, [map, tracks])

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

  // After the effect above, so it sees the new tracks' lines.
  useSelectionOverlay(map, tracks, linesRef, comparison?.rangeOn)
  useMapHover(map, tracks)
  useHoverMarker(map, tracks, comparison?.pointOn)

  return (
    <>
      <div className={styles.toolbar}>
        <TrackColorToggle
          value={shown}
          onChange={changeTrackColor}
          canColor={canColor}
          hint={compared ? COMPARE_HINT : undefined}
        />
      </div>
      <div ref={containerRef} className={styles.map} role="region" aria-label="Track map" />
      {/* Shown on touch screens only (CSS), where one finger scrolls the page. */}
      <p className={styles.touchHint}>Use two fingers to move or zoom the map.</p>
      {coloring && <SpeedLegend avg={coloring.avg} settings={coloring.settings} />}
    </>
  )
}
