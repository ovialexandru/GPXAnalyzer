import type L from 'leaflet'
import { useEffect, useMemo } from 'react'
import { createNearestPointFinder } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useViewStore } from '../view/index.ts'

/** How close (screen px) the cursor or a tap must be to a track point to hover it. */
export const HOVER_TOLERANCE_PX = 15

/**
 * Sets the shared hover from the mouse (or a tap) over the map: the nearest track point within
 * HOVER_TOLERANCE_PX, else none. Mouse moves are handled at most once per animation frame.
 */
export function useMapHover(map: L.Map | null, track: Track) {
  const store = useViewStore()
  const find = useMemo(() => createNearestPointFinder(track), [track])

  useEffect(() => {
    if (!map) return
    const clearOwn = () => {
      if (store.getState().hover?.source === 'map') store.setHover(null)
    }

    const update = (e: L.LeafletMouseEvent) => {
      const index = find(e.latlng.lat, e.latlng.lng)
      const point = index === null ? undefined : track.points[index]
      if (index === null || !point) return clearOwn()
      const at = map.latLngToContainerPoint([point.lat, point.lon])
      const px = Math.hypot(at.x - e.containerPoint.x, at.y - e.containerPoint.y)
      if (px > HOVER_TOLERANCE_PX) clearOwn()
      else store.setHover({ index, source: 'map' })
    }

    let frame: number | null = null
    let latest: L.LeafletMouseEvent | null = null
    const cancel = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      latest = null
    }
    const onMove = (e: L.LeafletMouseEvent) => {
      latest = e
      frame ??= requestAnimationFrame(() => {
        const event = latest
        frame = null
        latest = null
        if (event) update(event)
      })
    }
    const onOut = () => {
      cancel()
      clearOwn()
    }

    map.on('mousemove', onMove).on('click', update).on('mouseout', onOut)
    return () => {
      cancel()
      map.off('mousemove', onMove).off('click', update).off('mouseout', onOut)
    }
  }, [map, track, find, store])
}
