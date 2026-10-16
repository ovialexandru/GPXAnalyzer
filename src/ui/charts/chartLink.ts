import { useMemo } from 'react'
import type { TrackMetrics } from '../../metrics/index.ts'
import type { Comparison } from '../compare/comparison.ts'
import type { TrackId } from '../view/index.ts'
import type { CompareLineChart } from './compareOption.ts'
import type { LineChart } from './lineOption.ts'
import type { LineData } from './xAxis.ts'

/** How a chart of two compared tracks links to the shared view. */
export interface ChartTracks {
  /** The track the hooks' `line` and `metrics` belong to: hovers and ranges made on the chart are stored on it. */
  owner: TrackId
  /** Each track's metrics, to place hovers and ranges stored on either track. */
  metrics: Record<TrackId, TrackMetrics>
}

/** Metrics of the track a stored hover or range refers to (absent means A); `own` with one track. */
export function metricsFor(
  tracks: ChartTracks | undefined,
  own: TrackMetrics,
  id: TrackId | undefined,
): TrackMetrics {
  return tracks ? tracks.metrics[id ?? 'a'] : own
}

/** What a chart passes to its zoom, brush and hover hooks. */
export interface ChartLink {
  /** Axis value -> point mapping of the track hovers and ranges are stored on; null while there is no chart. */
  line: LineData | null
  metrics: TrackMetrics
  tracks?: ChartTracks
}

/**
 * With one track: the chart's own line and metrics. With a comparison: the axis line and metrics of
 * the track reaching further (whether or not this chart shows it), so every chart stores on the same track.
 */
export function useChartLink(
  comparison: Comparison | null,
  built: LineChart | CompareLineChart | null,
  metrics: TrackMetrics,
): ChartLink {
  return useMemo(() => {
    if (!comparison) return { line: built && 'line' in built ? built.line : null, metrics }
    const { owner, axes } = comparison
    return {
      line: built ? axes[owner].line : null,
      metrics: axes[owner].metrics,
      tracks: { owner, metrics: { a: axes.a.metrics, b: axes.b.metrics } },
    }
  }, [comparison, built, metrics])
}
