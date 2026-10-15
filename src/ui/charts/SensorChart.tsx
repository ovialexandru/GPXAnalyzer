import { useEffect, useMemo } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import { ChartCard } from './ChartCard.tsx'
import { buildSensorOption, type SensorKind } from './sensorOption.ts'
import { useChartBrush } from './useChartBrush.ts'
import { useChartHover } from './useChartHover.ts'
import { useChartZoom } from './useChartZoom.ts'
import { useECharts } from './useECharts.ts'
import type { XAxisMode } from './xAxis.ts'

const HEADINGS: Record<SensorKind, string> = { heartRate: 'Heart rate', cadence: 'Cadence' }

interface SensorChartProps {
  track: Track
  metrics: TrackMetrics
  mode: XAxisMode
  kind: SensorKind
  /** Show the zoom slider under this chart. */
  withSlider?: boolean
}

/** Heart rate or cadence chart. The panel renders it only when the track has that data. */
export function SensorChart({ track, metrics, mode, kind, withSlider = false }: SensorChartProps) {
  const { containerRef, chart } = useECharts()
  const built = useMemo(
    () => buildSensorOption(track, metrics, mode, kind, withSlider),
    [track, metrics, mode, kind, withSlider],
  )

  useEffect(() => {
    if (!chart) return
    chart.setOption(built.option, { notMerge: true })
  }, [chart, built])

  // Zoom first: a zoom change must reach the chart before the hover pointer is placed on it.
  useChartZoom(chart, built.line, metrics, mode)
  useChartBrush(chart, built.line, metrics, mode)
  useChartHover(chart, kind, built.line, metrics, mode)

  return (
    <ChartCard
      label={`${HEADINGS[kind]} chart`}
      heading={HEADINGS[kind]}
      withSlider={withSlider}
      containerRef={containerRef}
    />
  )
}
