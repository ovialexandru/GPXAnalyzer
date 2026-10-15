import { useEffect } from 'react'
import { useViewState, useViewStore } from '../view/index.ts'
import styles from './ChartToolbar.module.css'
import { SegmentedControl } from '../common/SegmentedControl.tsx'
import type { XAxisMode } from './xAxis.ts'

interface ChartToolbarProps {
  mode: XAxisMode
  /** The Time option needs timestamps. */
  hasTime: boolean
  onModeChange: (mode: XAxisMode) => void
}

/** Input types that don't take typed text, so Esc there still clears the selection. */
const NON_TEXT_INPUTS = new Set(['button', 'checkbox', 'color', 'file', 'radio', 'range', 'reset'])

/** Whether Esc belongs to the focused element: a text field or editable content. */
function isTextEntry(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(target.type)
  return target instanceof HTMLElement && target.isContentEditable
}

/**
 * Controls for both charts: the x-axis toggle, "Reset zoom" (disabled while not zoomed), and
 * "Zoom to selection" / "Clear selection" (disabled without a selection; Esc clears it too).
 */
export function ChartToolbar({ mode, hasTime, onModeChange }: ChartToolbarProps) {
  const store = useViewStore()
  const zoomed = useViewState((s) => s.zoom !== null)
  const selected = useViewState((s) => s.selection !== null)

  useEffect(() => {
    if (!selected) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTextEntry(e.target)) store.setSelection(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selected, store])

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
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.button}
          disabled={!zoomed}
          onClick={() => store.setZoom(null)}
        >
          Reset zoom
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!selected}
          onClick={() => store.setZoom(store.getState().selection)}
        >
          Zoom to selection
        </button>
        <button
          type="button"
          className={styles.button}
          disabled={!selected}
          onClick={() => store.setSelection(null)}
        >
          Clear selection
        </button>
      </div>
    </div>
  )
}
