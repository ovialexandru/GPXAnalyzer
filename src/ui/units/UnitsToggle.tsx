import { SegmentedControl } from '../common/SegmentedControl.tsx'
import { useUnits } from './UnitsContext.tsx'
import type { Units } from './units.ts'

const OPTIONS: { value: Units; label: string }[] = [
  { value: 'metric', label: 'Metric' },
  { value: 'imperial', label: 'Imperial' },
]

/** Metric / Imperial switch for every distance, elevation, speed and pace on the page. */
export function UnitsToggle() {
  const [units, setUnits] = useUnits()
  return <SegmentedControl legend="Units" value={units} options={OPTIONS} onChange={setUnits} />
}
