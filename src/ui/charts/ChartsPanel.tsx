import { useMemo, useState } from 'react'
import { getAvailableFields, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartToolbar } from './ChartToolbar.tsx'
import styles from './ChartsPanel.module.css'
import { ElevationChart } from './ElevationChart.tsx'
import { SensorChart } from './SensorChart.tsx'
import { SpeedChart } from './SpeedChart.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartsPanelProps {
  track: Track
  metrics: TrackMetrics
}

type SliderHost = 'elevation' | 'speed' | 'heartRate' | 'cadence'

/** The chart toolbar and the charts it drives. Heart rate and cadence appear only with data. */
export function ChartsPanel({ track, metrics }: ChartsPanelProps) {
  // The stored choice survives tracks without time; it applies again to the next timed track.
  const [chosenMode, setChosenMode] = useState<XAxisMode>('distance')
  const fields = useMemo(() => getAvailableFields(track), [track])
  const mode = fields.time ? chosenMode : 'distance'
  // One zoom slider, under the last chart with data. Speed has data whenever there's time.
  const slider: SliderHost = fields.cad
    ? 'cadence'
    : fields.hr
      ? 'heartRate'
      : fields.time
        ? 'speed'
        : 'elevation'

  return (
    <div className={styles.panel}>
      <ChartToolbar mode={mode} hasTime={fields.time} onModeChange={setChosenMode} />
      <ElevationChart
        track={track}
        metrics={metrics}
        mode={mode}
        withSlider={slider === 'elevation'}
      />
      <SpeedChart track={track} metrics={metrics} mode={mode} withSlider={slider === 'speed'} />
      {fields.hr && (
        <SensorChart
          track={track}
          metrics={metrics}
          mode={mode}
          kind="heartRate"
          withSlider={slider === 'heartRate'}
        />
      )}
      {fields.cad && (
        <SensorChart
          track={track}
          metrics={metrics}
          mode={mode}
          kind="cadence"
          withSlider={slider === 'cadence'}
        />
      )}
    </div>
  )
}
