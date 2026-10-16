// The stats shown for a track or a selection, shared by the summary and the comparison table.
import type { AvailableFields, TrackTotals } from '../../metrics/index.ts'
import {
  formatCadence,
  formatDistance,
  formatDuration,
  formatElevation,
  formatHeartRate,
  formatSpeed,
} from '../format.ts'
import type { Units } from '../units/units.ts'

/** Badge text for each optional kind of data. */
export const FIELD_LABELS: Record<keyof AvailableFields, string> = {
  ele: 'Elevation',
  time: 'Time',
  hr: 'Heart rate',
  cad: 'Cadence',
}

/** Labels of the optional data the track has, in badge order. */
export function fieldBadges(fields: AvailableFields): string[] {
  return (Object.keys(FIELD_LABELS) as (keyof AvailableFields)[])
    .filter((k) => fields[k])
    .map((k) => FIELD_LABELS[k])
}

export const STAT_LABELS = [
  'Distance',
  'Duration',
  'Elevation gain',
  'Avg speed',
  'Max speed',
  'Avg HR',
  'Max HR',
  'Avg cadence',
  'Max cadence',
] as const

export type StatLabel = (typeof STAT_LABELS)[number]

function orNull(value: number | null, format: (v: number) => string): string | null {
  return value === null ? null : format(value)
}

/** Each stat as display text, in STAT_LABELS order; null when the track has no value for it (no time / no elevation). */
export function statRows(totals: TrackTotals, units: Units): [StatLabel, string | null][] {
  return [
    ['Distance', formatDistance(totals.distance, units)],
    ['Duration', orNull(totals.duration, formatDuration)],
    ['Elevation gain', orNull(totals.elevationGain, (m) => formatElevation(m, units))],
    ['Avg speed', orNull(totals.avgSpeed, (v) => formatSpeed(v, units))],
    ['Max speed', orNull(totals.maxSpeed, (v) => formatSpeed(v, units))],
    ['Avg HR', orNull(totals.avgHeartRate, formatHeartRate)],
    ['Max HR', orNull(totals.maxHeartRate, formatHeartRate)],
    ['Avg cadence', orNull(totals.avgCadence, formatCadence)],
    ['Max cadence', orNull(totals.maxCadence, formatCadence)],
  ]
}
