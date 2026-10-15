import { useEffect, useMemo } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useUnits } from '../units/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { buildElevationOption } from './elevationOption.ts'
import { useChartBrush } from './useChartBrush.ts'
import { useChartHover } from './useChartHover.ts'
import { useChartZoom } from './useChartZoom.ts'
import { useECharts } from './useECharts.ts'
import type { XAxisMode } from './xAxis.ts'

interface ElevationChartProps {
  track: Track
  metrics: TrackMetrics
  mode: XAxisMode
  /** Show the zoom slider under this chart. */
  withSlider?: boolean
}

/** Elevation profile, or an empty state when the track has no elevation. */
export function ElevationChart({ track, metrics, mode, withSlider = false }: ElevationChartProps) {
  const hasElevation = useMemo(() => getAvailableFields(track).ele, [track])
  const [units] = useUnits()
  const { containerRef, chart } = useECharts()
  const built = useMemo(
    () => (hasElevation ? buildElevationOption(track, metrics, mode, withSlider, units) : null),
    [hasElevation, track, metrics, mode, withSlider, units],
  )

  // Same chart across tracks and modes: replace the whole option.
  useEffect(() => {
    if (!chart || !built) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  useChartZoom(chart, built?.line ?? null, metrics, mode, units)
  useChartBrush(chart, built?.line ?? null, metrics, mode, units)
  useChartHover(chart, 'elevation', built?.line ?? null, metrics, mode, units)

  return (
    <ChartCard
      label="Elevation chart"
      heading="Elevation"
      emptyMessage={hasElevation ? undefined : 'This track has no elevation data.'}
      withSlider={withSlider}
      containerRef={containerRef}
    />
  )
}
