import { useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { useComparison } from '../compare/ComparisonContext.tsx'
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
  /** The chosen x-axis, when the caller keeps it (e.g. for the comparison); otherwise kept here. */
  chosenMode?: XAxisMode
  onChosenModeChange?: (mode: XAxisMode) => void
}

export const COMPARE_TIME_HINT = 'Both tracks need timestamps for the time axis.'

/**
 * The chart toolbar and the charts it drives: speed, elevation, then heart rate and cadence when
 * the track has them. Each chart collapses to its heading. While two tracks are compared, the
 * charts show both; the time axis then needs timestamps in both.
 */
export function ChartsPanel({
  track,
  metrics,
  chosenMode: controlledMode,
  onChosenModeChange,
}: ChartsPanelProps) {
  // The stored choice survives tracks without time; it applies again to the next timed track.
  const [ownMode, setOwnMode] = useState<XAxisMode>('distance')
  const chosenMode = controlledMode ?? ownMode
  const setChosenMode = (next: XAxisMode) => {
    setOwnMode(next)
    onChosenModeChange?.(next)
  }
  const [collapsed, toggleCollapsed] = useCollapsedCharts()
  const comparison = useComparison()
  const ownFields = useMemo(() => getAvailableFields(track), [track])
  const compareFields = useMemo(
    () => comparison?.entries.map((e) => getAvailableFields(e.track)) ?? null,
    [comparison],
  )
  // With a comparison: a chart shows when either track has its data, time needs both.
  const fields = compareFields
    ? {
        time: compareFields.some((f) => f.time),
        ele: compareFields.some((f) => f.ele),
        hr: compareFields.some((f) => f.hr),
        cad: compareFields.some((f) => f.cad),
      }
    : ownFields
  const timeAxis = compareFields ? compareFields.every((f) => f.time) : ownFields.time
  const mode = comparison ? comparison.mode : timeAxis ? chosenMode : 'distance'

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
      <ChartToolbar
        mode={mode}
        hasTime={timeAxis}
        timeHint={comparison ? COMPARE_TIME_HINT : undefined}
        onModeChange={setChosenMode}
      />
      <SpeedChart {...chartProps('speed')} />
      <ElevationChart {...chartProps('elevation')} />
      {fields.hr && <SensorChart kind="heartRate" {...chartProps('heartRate')} />}
      {fields.cad && <SensorChart kind="cadence" {...chartProps('cadence')} />}
    </div>
  )
}
