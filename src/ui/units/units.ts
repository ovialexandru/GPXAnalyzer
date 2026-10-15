// Display units. Metrics stay SI; only the UI converts.

export type Units = 'metric' | 'imperial'

export const METERS_PER_MILE = 1609.344
export const FEET_PER_METER = 3.28084

/** Meters per unit on the distance axis: 1000 (km) or 1609.344 (mi). */
export function distanceUnitMeters(units: Units): number {
  return units === 'imperial' ? METERS_PER_MILE : 1000
}

const STORAGE_KEY = 'gpx-analyzer.units'

/** The remembered choice; Metric when missing, invalid, or storage is unavailable. */
export function loadUnits(): Units {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'imperial' ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}

/** Remembers the choice; storage errors (private mode, blocked site data) are ignored. */
export function saveUnits(units: Units): void {
  try {
    localStorage.setItem(STORAGE_KEY, units)
  } catch {
    // Not remembered: the choice still applies to this visit.
  }
}
