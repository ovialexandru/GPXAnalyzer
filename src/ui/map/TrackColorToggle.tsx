import { SegmentedControl } from '../common/SegmentedControl.tsx'
import type { TrackColor } from './trackColor.ts'

export const NO_SPEED_HINT = "This track has no timestamps, so it can't be colored by speed."

interface TrackColorToggleProps {
  value: TrackColor
  onChange: (value: TrackColor) => void
  /** False when the track has no average speed: Speed is then disabled. */
  canColor: boolean
}

/** Plain / Speed switch for how the map draws the track. */
export function TrackColorToggle({ value, onChange, canColor }: TrackColorToggleProps) {
  return (
    <SegmentedControl
      legend="Track color"
      value={value}
      options={[
        { value: 'plain', label: 'Plain' },
        { value: 'speed', label: 'Speed', disabled: !canColor, hint: NO_SPEED_HINT },
      ]}
      onChange={onChange}
    />
  )
}
