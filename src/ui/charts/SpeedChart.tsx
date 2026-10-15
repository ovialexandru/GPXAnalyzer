import { useEffect, useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useUnits } from '../units/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { SegmentedControl } from '../common/SegmentedControl.tsx'
import { buildSpeedOption, type SpeedMetric } from './speedOption.ts'
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
}

/** Speed or pace chart with its own switch, or an empty state when the track has no timestamps. */
export function SpeedChart({ track, metrics, mode, withSlider = false }: SpeedChartProps) {
  const [metric, setMetric] = useState<SpeedMetric>('speed')
  const hasTime = useMemo(() => getAvailableFields(track).time, [track])
  const [units] = useUnits()
  const { containerRef, chart } = useECharts()
  const built = useMemo(
    () => (hasTime ? buildSpeedOption(track, metrics, mode, metric, withSlider, units) : null),
    [hasTime, track, metrics, mode, metric, withSlider, units],
  )

  useEffect(() => {
    if (!chart || !built) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  useChartZoom(chart, built?.line ?? null, metrics, mode, units)
  useChartBrush(chart, built?.line ?? null, metrics, mode, units)
  useChartHover(chart, 'speed', built?.line ?? null, metrics, mode, units)

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
      containerRef={containerRef}
    />
  )
}
