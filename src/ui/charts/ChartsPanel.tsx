import { useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import styles from './ChartsPanel.module.css'
import { ElevationChart } from './ElevationChart.tsx'
import { SegmentedControl } from './SegmentedControl.tsx'
import { SpeedChart } from './SpeedChart.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartsPanelProps {
  track: Track
  metrics: TrackMetrics
}

/** The x-axis toggle and the charts it drives. */
export function ChartsPanel({ track, metrics }: ChartsPanelProps) {
  // The stored choice survives tracks without time; it applies again to the next timed track.
  const [chosenMode, setChosenMode] = useState<XAxisMode>('distance')
  const hasTime = useMemo(() => getAvailableFields(track).time, [track])
  const mode = hasTime ? chosenMode : 'distance'

  return (
    <div className={styles.panel}>
      <SegmentedControl
        legend="X axis"
        value={mode}
        options={[
          { value: 'distance', label: 'Distance' },
          {
            value: 'time',
            label: 'Time',
            disabled: !hasTime,
            hint: 'No timestamps in this track',
          },
        ]}
        onChange={setChosenMode}
      />
      <ElevationChart track={track} metrics={metrics} mode={mode} />
      <SpeedChart track={track} metrics={metrics} mode={mode} />
    </div>
  )
}
