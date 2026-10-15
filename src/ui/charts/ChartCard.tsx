import { useId, type ReactNode } from 'react'
import styles from './ChartCard.module.css'
import { CHART_HEIGHT, SLIDER_SPACE } from './chartTheme.ts'

interface ChartCardProps {
  /** Accessible name of the region, e.g. "Elevation chart". */
  label: string
  heading: string
  /** Extra controls shown next to the heading while expanded. */
  controls?: ReactNode
  /** Shown instead of the chart when set; the chart container is then not rendered. */
  emptyMessage?: string
  /** The chart carries the zoom slider: its canvas grows to fit it. */
  withSlider?: boolean
  /** Only the heading is shown; the chart container is not rendered. */
  collapsed?: boolean
  onToggleCollapsed?: () => void
  containerRef: (node: HTMLDivElement | null) => void
}

/**
 * Bordered chart region with a heading that collapses and expands it, and either the chart
 * container or an empty-state card.
 */
export function ChartCard({
  label,
  heading,
  controls,
  emptyMessage,
  withSlider = false,
  collapsed = false,
  onToggleCollapsed,
  containerRef,
}: ChartCardProps) {
  const bodyId = useId()
  return (
    <section className={styles.card} aria-label={label}>
      <div className={styles.header}>
        <h2 className={styles.heading}>
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={onToggleCollapsed}
          >
            <span className={styles.chevron} aria-hidden="true" />
            {heading}
          </button>
        </h2>
        {!collapsed && controls}
      </div>
      <div id={bodyId} hidden={collapsed}>
        {collapsed ? null : emptyMessage ? (
          <p className={styles.empty} style={{ height: CHART_HEIGHT }}>
            {emptyMessage}
          </p>
        ) : (
          <div
            ref={containerRef}
            className={styles.chart}
            style={{ height: CHART_HEIGHT + (withSlider ? SLIDER_SPACE : 0) }}
          />
        )}
      </div>
    </section>
  )
}
