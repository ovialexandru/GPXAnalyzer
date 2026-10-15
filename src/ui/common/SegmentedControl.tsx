import { useId } from 'react'
import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
  disabled?: boolean
  /** Why the option is disabled, shown as a tooltip. */
  hint?: string
}

interface SegmentedControlProps<T extends string> {
  legend: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
}

/** Native radio inputs in a fieldset, styled as a segmented button group (arrow keys work natively). */
export function SegmentedControl<T extends string>({
  legend,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  const name = useId()
  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>{legend}</legend>
      <div className={styles.options}>
        {options.map((o) => (
          <label key={o.value} className={styles.option} title={o.disabled ? o.hint : undefined}>
            <input
              type="radio"
              className={styles.input}
              name={name}
              value={o.value}
              checked={o.value === value}
              disabled={o.disabled}
              onChange={() => !o.disabled && onChange(o.value)}
            />
            <span className={styles.label}>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
