import { useEffect, useMemo } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useComparison } from '../compare/ComparisonContext.tsx'
import { useUnits } from '../units/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { useChartLink } from './chartLink.ts'
import { buildSensorCompareOption, buildSensorOption, type SensorKind } from './sensorOption.ts'
import { useChartBrush } from './useChartBrush.ts'
import { useChartHover } from './useChartHover.ts'
import { useChartZoom } from './useChartZoom.ts'
import { useECharts } from './useECharts.ts'
import type { XAxisMode } from './xAxis.ts'

const HEADINGS: Record<SensorKind, string> = { heartRate: 'Heart rate', cadence: 'Cadence' }
const FIELDS = { heartRate: 'hr', cadence: 'cad' } as const

interface SensorChartProps {
  track: Track
  metrics: TrackMetrics
  mode: XAxisMode
  kind: SensorKind
  /** Show the zoom slider under this chart. */
  withSlider?: boolean
  /** Only the heading is shown; no chart is created. */
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

/**
 * Heart rate or cadence chart. The panel renders it only when the track (or, while two tracks are
 * compared, either of them) has that data; then it shows each track that has it.
 */
export function SensorChart({
  track,
  metrics,
  mode,
  kind,
  withSlider = false,
  collapsed = false,
  onToggleCollapsed,
}: SensorChartProps) {
  const [units] = useUnits()
  const comparison = useComparison()
  // The compared tracks with this data; null with one track.
  const withData = useMemo(
    () => comparison?.entries.filter((e) => getAvailableFields(e.track)[FIELDS[kind]]) ?? null,
    [comparison, kind],
  )
  const { containerRef, chart } = useECharts()
  const built = useMemo(() => {
    if (collapsed) return null
    if (comparison && withData) {
      const axisMetrics = comparison.axes[comparison.owner].metrics
      return buildSensorCompareOption(withData, axisMetrics, mode, kind, withSlider, units)
    }
    return buildSensorOption(track, metrics, mode, kind, withSlider, units)
  }, [collapsed, comparison, withData, track, metrics, mode, kind, withSlider, units])

  useEffect(() => {
    if (!chart || !built) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  const link = useChartLink(comparison, built, metrics)
  useChartZoom(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartBrush(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartHover(chart, kind, link.line, link.metrics, mode, units, link.tracks)

  return (
    <ChartCard
      label={`${HEADINGS[kind]} chart`}
      heading={HEADINGS[kind]}
      withSlider={withSlider}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      containerRef={containerRef}
    />
  )
}
