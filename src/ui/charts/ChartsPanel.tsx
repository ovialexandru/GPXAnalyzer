import { useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartToolbar } from './ChartToolbar.tsx'
import styles from './ChartsPanel.module.css'
import { CHART_KINDS, useCollapsedCharts, type ChartKind } from './collapsedCharts.ts'
import { ElevationChart } from './ElevationChart.tsx'
import { SensorChart } from './SensorChart.tsx'
import { SpeedChart } from './SpeedChart.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartsPanelProps {
  track: Track
  metrics: TrackMetrics
}

/**
 * The chart toolbar and the charts it drives: speed, elevation, then heart rate and cadence when
 * the track has them. Each chart collapses to its heading.
 */
export function ChartsPanel({ track, metrics }: ChartsPanelProps) {
  // The stored choice survives tracks without time; it applies again to the next timed track.
  const [chosenMode, setChosenMode] = useState<XAxisMode>('distance')
  const [collapsed, toggleCollapsed] = useCollapsedCharts()
  const fields = useMemo(() => getAvailableFields(track), [track])
  const mode = fields.time ? chosenMode : 'distance'

  // One zoom slider, under the last expanded chart with data. Speed has data whenever there's time.
  const hasData: Record<ChartKind, boolean> = {
    speed: fields.time,
    elevation: fields.ele,
    heartRate: fields.hr,
    cadence: fields.cad,
  }
  const slider = CHART_KINDS.findLast((k) => hasData[k] && !collapsed.has(k))
  const chartProps = (kind: ChartKind) => ({
    track,
    metrics,
    mode,
    withSlider: slider === kind,
    collapsed: collapsed.has(kind),
    onToggleCollapsed: () => toggleCollapsed(kind),
  })

  return (
    <div className={styles.panel}>
      <ChartToolbar mode={mode} hasTime={fields.time} onModeChange={setChosenMode} />
      <SpeedChart {...chartProps('speed')} />
      <ElevationChart {...chartProps('elevation')} />
      {fields.hr && <SensorChart kind="heartRate" {...chartProps('heartRate')} />}
      {fields.cad && <SensorChart kind="cadence" {...chartProps('cadence')} />}
    </div>
  )
}
