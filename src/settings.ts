// App settings, edited here; changes take effect on the next build.

/** Colors of the speed-colored track, as `#rrggbb`. */
export interface SpeedColors {
  /** At and below the lower threshold. */
  slow: string
  /** At the average speed. */
  avg: string
  /** At and above the upper threshold. */
  fast: string
  /** Stretches without speed (no timestamps). */
  noSpeed: string
}

export interface SpeedColorSettings {
  /** Lower threshold as a fraction below the average moving speed (0 < below < 1). */
  below: number
  /** Upper threshold as a fraction above the average moving speed (> 0). */
  above: number
  colors: SpeedColors
  /** Window of the speed used for coloring, in seconds (charts keep their own 5 s speed). */
  smoothingSeconds: number
  /** Color steps on each side of the gradient (slow → avg and avg → fast). */
  gradientSteps: number
}

/** Speed-colored track: red below avg − 25%, green around avg, blue above avg + 25%. */
export const SPEED_COLORS: SpeedColorSettings = {
  below: 0.25,
  above: 0.25,
  colors: {
    slow: '#dc2626',
    avg: '#16a34a',
    fast: '#2563eb',
    noSpeed: '#9ca3af',
  },
  smoothingSeconds: 15,
  gradientSteps: 16,
}

/** Colors of the two compared tracks, as `#rrggbb`. */
export interface CompareColors {
  /** Track A: lines, chart series, hover marker and stats column. */
  a: string
  /** Track B. */
  b: string
}

/** Compared tracks: blue A (the plain track color) and orange B, distinct for color-blind users too. */
export const COMPARE_COLORS: CompareColors = {
  a: '#1d4ed8',
  b: '#ea580c',
}
