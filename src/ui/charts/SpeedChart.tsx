import { useEffect, useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { SegmentedControl } from './SegmentedControl.tsx'
import { buildSpeedOption, type SpeedMetric } from './speedOption.ts'
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
}

/** Speed or pace chart with its own switch, or an empty state when the track has no timestamps. */
export function SpeedChart({ track, metrics, mode }: SpeedChartProps) {
  const [metric, setMetric] = useState<SpeedMetric>('speed')
  const hasTime = useMemo(() => getAvailableFields(track).time, [track])
  const { containerRef, chart } = useECharts()

  useEffect(() => {
    if (!chart || !hasTime) return
    chart.setOption(buildSpeedOption(track, metrics, mode, metric), { notMerge: true })
  }, [chart, hasTime, track, metrics, mode, metric])

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
      containerRef={containerRef}
    />
  )
}
