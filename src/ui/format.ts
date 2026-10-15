// Display formatting. Metrics are SI (m, s, m/s, s/m); units are converted only here.
import { FEET_PER_METER, METERS_PER_MILE, type Units } from './units/units.ts'

function fixed(value: number, decimals: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** Metric: "850 m" under 1 km, else "2.52 km". Imperial: "850 ft" under 0.1 mi, else "1.57 mi". */
export function formatDistance(meters: number, units: Units = 'metric'): string {
  if (units === 'imperial') {
    const miles = meters / METERS_PER_MILE
    return miles < 0.1 ? `${fixed(meters * FEET_PER_METER, 0)} ft` : `${fixed(miles, 2)} mi`
  }
  return Math.round(meters) < 1000 ? `${fixed(meters, 0)} m` : `${fixed(meters / 1000, 2)} km`
}

/** "m:ss" under one hour ("10:44"), else "h:mm:ss" ("1:02:03"). */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/** Whole meters ("22 m") or feet ("72 ft"). */
export function formatElevation(meters: number, units: Units = 'metric'): string {
  return units === 'imperial' ? `${fixed(meters * FEET_PER_METER, 0)} ft` : `${fixed(meters, 0)} m`
}

/** Whole beats per minute: "144 bpm". */
export function formatHeartRate(bpm: number): string {
  return `${fixed(bpm, 0)} bpm`
}

/** Whole revolutions per minute, as recorded: "82 rpm". */
export function formatCadence(rpm: number): string {
  return `${fixed(rpm, 0)} rpm`
}

/** One decimal: "12.3 km/h" or "7.6 mph". */
export function formatSpeed(metersPerSecond: number, units: Units = 'metric'): string {
  return units === 'imperial'
    ? `${fixed((metersPerSecond * 3600) / METERS_PER_MILE, 1)} mph`
    : `${fixed(metersPerSecond * 3.6, 1)} km/h`
}

/** Minutes per km ("5:12 /km") or per mile ("8:22 /mi"). */
export function formatPace(secondsPerMeter: number, units: Units = 'metric'): string {
  return units === 'imperial'
    ? `${formatDuration(secondsPerMeter * METERS_PER_MILE)} /mi`
    : `${formatDuration(secondsPerMeter * 1000)} /km`
}
