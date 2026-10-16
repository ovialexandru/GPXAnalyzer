import { useEffect, useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useComparison } from '../compare/ComparisonContext.tsx'
import { useUnits } from '../units/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { useChartLink } from './chartLink.ts'
import { SegmentedControl } from '../common/SegmentedControl.tsx'
import { buildSpeedCompareOption, buildSpeedOption, type SpeedMetric } from './speedOption.ts'
import { useChartBrush } from './useChartBrush.ts'
import { useChartHover } from './useChartHover.ts'
import { useChartZoom } from './useChartZoom.ts'
import { useECharts } from './useECharts.ts'
import type { XAxisMode } from './xAxis.ts'

const METRIC_OPTIONS: { value: SpeedMetric; label: string }[] = [
  { value: 'speed', label: 'Speed' },
  { value: 'pace', label: 'Pace' },
]

interface SpeedChartProps {
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
 * Speed or pace chart with its own switch, or an empty state when the track has no timestamps.
 * While two tracks are compared, it shows each one that has timestamps.
 */
export function SpeedChart({
  track,
  metrics,
  mode,
  withSlider = false,
  collapsed = false,
  onToggleCollapsed,
}: SpeedChartProps) {
  const [metric, setMetric] = useState<SpeedMetric>('speed')
  const comparison = useComparison()
  // The compared tracks with timestamps; null with one track.
  const timed = useMemo(
    () => comparison?.entries.filter((e) => getAvailableFields(e.track).time) ?? null,
    [comparison],
  )
  const ownTime = useMemo(() => getAvailableFields(track).time, [track])
  const hasTime = timed ? timed.length > 0 : ownTime
  const [units] = useUnits()
  const { containerRef, chart } = useECharts()
  const built = useMemo(() => {
    if (!hasTime || collapsed) return null
    if (comparison && timed) {
      const axisMetrics = comparison.axes[comparison.owner].metrics
      return buildSpeedCompareOption(timed, axisMetrics, mode, metric, withSlider, units)
    }
    return buildSpeedOption(track, metrics, mode, metric, withSlider, units)
  }, [hasTime, collapsed, comparison, timed, track, metrics, mode, metric, withSlider, units])

  useEffect(() => {
    if (!chart || !built) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  const link = useChartLink(comparison, built, metrics)
  useChartZoom(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartBrush(chart, link.line, link.metrics, mode, units, link.tracks)
  useChartHover(chart, 'speed', link.line, link.metrics, mode, units, link.tracks)

  return (
    <ChartCard
      label="Speed chart"
      heading={metric === 'speed' ? 'Speed' : 'Pace'}
      controls={
        hasTime && (
          <SegmentedControl
            legend="Speed or pace"
            value={metric}
            options={METRIC_OPTIONS}
            onChange={setMetric}
          />
        )
      }
      emptyMessage={
        hasTime ? undefined : "This track has no timestamps, so speed and pace can't be shown."
      }
      withSlider={withSlider}
      collapsed={collapsed}
      onToggleCollapsed={onToggleCollapsed}
      containerRef={containerRef}
    />
  )
}
