import { useViewState, useViewStore } from '../view/index.ts'
import styles from './ChartToolbar.module.css'
import { SegmentedControl } from './SegmentedControl.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartToolbarProps {
  mode: XAxisMode
  /** The Time option needs timestamps. */
  hasTime: boolean
  onModeChange: (mode: XAxisMode) => void
}

/** Controls for both charts: the x-axis toggle and "Reset zoom" (disabled while not zoomed). */
export function ChartToolbar({ mode, hasTime, onModeChange }: ChartToolbarProps) {
  const store = useViewStore()
  const zoomed = useViewState((s) => s.zoom !== null)

  return (
    <div className={styles.toolbar}>
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
        onChange={onModeChange}
      />
      <button
        type="button"
        className={styles.reset}
        disabled={!zoomed}
        onClick={() => store.setZoom(null)}
      >
        Reset zoom
      </button>
    </div>
  )
}
