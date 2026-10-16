import { SegmentedControl } from '../common/SegmentedControl.tsx'
import type { TrackColor } from './trackColor.ts'

export const NO_SPEED_HINT = "This track has no timestamps, so it can't be colored by speed."
export const COMPARE_HINT = 'Speed colors are off while comparing two tracks.'

interface TrackColorToggleProps {
  value: TrackColor
  onChange: (value: TrackColor) => void
  /** False when the track has no average speed (or two tracks are compared): Speed is then disabled. */
  canColor: boolean
  /** Why Speed is disabled; the no-timestamps hint by default. */
  hint?: string
}

/** Plain / Speed switch for how the map draws the track. */
export function TrackColorToggle({
  value,
  onChange,
  canColor,
  hint = NO_SPEED_HINT,
}: TrackColorToggleProps) {
  return (
    <SegmentedControl
      legend="Track color"
      value={value}
      options={[
        { value: 'plain', label: 'Plain' },
        { value: 'speed', label: 'Speed', disabled: !canColor, hint },
      ]}
      onChange={onChange}
    />
  )
}
