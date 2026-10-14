import { useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartToolbar } from './ChartToolbar.tsx'
import styles from './ChartsPanel.module.css'
import { ElevationChart } from './ElevationChart.tsx'
import { SpeedChart } from './SpeedChart.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartsPanelProps {
  track: Track
  metrics: TrackMetrics
}

/** The chart toolbar and the charts it drives. */
export function ChartsPanel({ track, metrics }: ChartsPanelProps) {
  // The stored choice survives tracks without time; it applies again to the next timed track.
  const [chosenMode, setChosenMode] = useState<XAxisMode>('distance')
  const fields = useMemo(() => getAvailableFields(track), [track])
  const mode = fields.time ? chosenMode : 'distance'
  // One zoom slider, under the last chart with data. Speed has data whenever there's time.
  const sliderOnSpeed = fields.time

  return (
    <div className={styles.panel}>
      <ChartToolbar mode={mode} hasTime={fields.time} onModeChange={setChosenMode} />
      <ElevationChart track={track} metrics={metrics} mode={mode} withSlider={!sliderOnSpeed} />
      <SpeedChart track={track} metrics={metrics} mode={mode} withSlider={sliderOnSpeed} />
    </div>
  )
}
