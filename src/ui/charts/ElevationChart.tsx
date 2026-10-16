import { useEffect, useMemo } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useComparison } from '../compare/ComparisonContext.tsx'
import { useUnits } from '../units/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { useChartLink } from './chartLink.ts'
import { buildElevationCompareOption, buildElevationOption } from './elevationOption.ts'
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
  /** Only the heading is shown; no chart is created. */
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

/**
 * Elevation profile, or an empty state when the track has no elevation. While two tracks are
 * compared, it shows each one that has elevation.
 */
export function ElevationChart({
  track,
  metrics,
  mode,
  withSlider = false,
  collapsed = false,
  onToggleCollapsed,
}: ElevationChartProps) {
  const comparison = useComparison()
  // The compared tracks with elevation; null with one track.
  const withEle = useMemo(
    () => comparison?.entries.filter((e) => getAvailableFields(e.track).ele) ?? null,
    [comparison],
  )
  const ownEle = useMemo(() => getAvailableFields(track).ele, [track])
  const hasElevation = withEle ? withEle.length > 0 : ownEle
  const [units] = useUnits()
  const { containerRef, chart } = useECharts()
  const built = useMemo(() => {
    if (!hasElevation || collapsed) return null
    if (comparison && withEle) {
      const axisMetrics = comparison.axes[comparison.owner].metrics
      return buildElevationCompareOption(withEle, axisMetrics, mode, withSlider, units)
    }
    return buildElevationOption(track, metrics, mode, withSlider, units)
  }, [hasElevation, collapsed, comparison, withEle, track, metrics, mode, withSlider, units])

  // Same chart across tracks and modes: replace the whole option.
  useEffect(() => {
    if (!chart || !built) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  const link = useChartLink(comparison, built, metrics)
  useChartZoom(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartBrush(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartHover(chart, 'elevation', link.line, link.metrics, mode, units, link.tracks)

  return (
    <ChartCard
      label="Elevation chart"
      heading="Elevation"
      emptyMessage={hasElevation ? undefined : 'This track has no elevation data.'}
      withSlider={withSlider}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      containerRef={containerRef}
    />
  )
}
