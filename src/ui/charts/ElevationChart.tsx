import { useEffect, useMemo } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { buildElevationOption } from './elevationOption.ts'
import { useECharts } from './useECharts.ts'
import type { XAxisMode } from './xAxis.ts'

interface ElevationChartProps {
  track: Track
  metrics: TrackMetrics
  mode: XAxisMode
}

/** Elevation profile, or an empty state when the track has no elevation. */
export function ElevationChart({ track, metrics, mode }: ElevationChartProps) {
  const hasElevation = useMemo(() => getAvailableFields(track).ele, [track])
  const { containerRef, chart } = useECharts()

  // Same chart across tracks and modes: replace the whole option.
  useEffect(() => {
    if (!chart || !hasElevation) return
    chart.setOption(buildElevationOption(track, metrics, mode), { notMerge: true })
  }, [chart, hasElevation, track, metrics, mode])

  return (
    <ChartCard
      label="Elevation chart"
      heading="Elevation"
      emptyMessage={hasElevation ? undefined : 'This track has no elevation data.'}
      containerRef={containerRef}
    />
  )
}
