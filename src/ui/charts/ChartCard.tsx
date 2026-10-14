import type { ReactNode } from 'react'
import styles from './ChartCard.module.css'
import { CHART_HEIGHT } from './chartTheme.ts'

interface ChartCardProps {
  /** Accessible name of the region, e.g. "Elevation chart". */
  label: string
  heading: string
  /** Extra controls shown next to the heading. */
  controls?: ReactNode
  /** Shown instead of the chart when set; the chart container is then not rendered. */
  emptyMessage?: string
  containerRef: (node: HTMLDivElement | null) => void
}

/** Bordered chart region with a heading, and either the chart container or an empty-state card. */
export function ChartCard({
  label,
  heading,
  controls,
  emptyMessage,
  containerRef,
}: ChartCardProps) {
  return (
    <section className={styles.card} aria-label={label}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{heading}</h2>
        {controls}
      </div>
      {emptyMessage ? (
        <p className={styles.empty} style={{ height: CHART_HEIGHT }}>
          {emptyMessage}
        </p>
      ) : (
        <div ref={containerRef} className={styles.chart} style={{ height: CHART_HEIGHT }} />
      )}
    </section>
  )
}
