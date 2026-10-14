// Display formatting. Metrics are SI (m, s, m/s, s/m); units are converted only here.

function fixed(value: number, decimals: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** "850 m" under 1 km, otherwise "2.52 km". */
export function formatDistance(meters: number): string {
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

/** Whole meters: "22 m". */
export function formatElevation(meters: number): string {
  return `${fixed(meters, 0)} m`
}

/** Whole beats per minute: "144 bpm". */
export function formatHeartRate(bpm: number): string {
  return `${fixed(bpm, 0)} bpm`
}

/** km/h with one decimal: "12.3 km/h". */
export function formatSpeed(metersPerSecond: number): string {
  return `${fixed(metersPerSecond * 3.6, 1)} km/h`
}

/** Minutes per km: "5:12 /km". */
export function formatPace(secondsPerMeter: number): string {
  return `${formatDuration(secondsPerMeter * 1000)} /km`
}
