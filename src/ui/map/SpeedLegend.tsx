import type { CSSProperties } from 'react'
import type { SpeedColorSettings } from '../../settings.ts'
import { formatSpeed } from '../format.ts'
import { useUnits } from '../units/index.ts'
import { gradientPalette, speedThresholds } from './speedColors.ts'
import styles from './TrackMap.module.css'

interface SpeedLegendProps {
  /** Average moving speed (m/s) the colors compare with. */
  avg: number
  settings: SpeedColorSettings
}

/** The speed color scale: a gradient bar with the lower threshold, the average and the upper one. */
export function SpeedLegend({ avg, settings }: SpeedLegendProps) {
  const [units] = useUnits()
  const { lower, upper } = speedThresholds(avg, settings)
  const bar: CSSProperties = {
    background: `linear-gradient(to right, ${gradientPalette(settings).join(', ')})`,
  }
  return (
    <div className={styles.legend} role="group" aria-label="Speed colors">
      <div className={styles.legendBar} style={bar} aria-hidden="true" />
      <div className={styles.legendLabels}>
        <span>≤ {formatSpeed(lower, units)}</span>
        <span>avg {formatSpeed(avg, units)}</span>
        <span>≥ {formatSpeed(upper, units)}</span>
      </div>
    </div>
  )
}
