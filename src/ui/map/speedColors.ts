// Speed-colored track: pure color math, no Leaflet. Speeds are m/s.
import { clipSegmentRanges, type PointRange } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import type { SpeedColors, SpeedColorSettings } from '../../settings.ts'

/** What the map needs to color a track: per-point (smoothed) speed and the reference average. */
export interface SpeedColoring {
  speed: (number | null)[]
  /** Average moving speed, > 0. */
  avg: number
  settings: SpeedColorSettings
}

/** One stretch drawn in a single color; consecutive runs share their boundary point. */
export interface ColorRun {
  color: string
  latlngs: [lat: number, lon: number][]
}

/** The speeds at which the gradient reaches the slow and fast colors. */
export function speedThresholds(
  avg: number,
  { below, above }: Pick<SpeedColorSettings, 'below' | 'above'>,
): { lower: number; upper: number } {
  return { lower: avg * (1 - below), upper: avg * (1 + above) }
}

/** −1 at and below the lower threshold, 0 at avg, 1 at and above the upper threshold. */
export function speedPosition(
  speed: number,
  avg: number,
  { below, above }: Pick<SpeedColorSettings, 'below' | 'above'>,
): number {
  return speed < avg
    ? -Math.min(1, (avg - speed) / (avg * below))
    : Math.min(1, (speed - avg) / (avg * above))
}

/** `t` rounded to `steps` steps per side. */
export function quantize(t: number, steps: number): number {
  return Math.round(t * steps) / steps || 0 // no −0
}

type Hsl = [h: number, s: number, l: number]

function hexToHsl(hex: string): Hsl {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [NaN, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex([h, s, l]: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const sector = Math.floor(h / 60) % 6
  const [r, g, b] = [
    [c, x, 0],
    [x, c, 0],
    [0, c, x],
    [0, x, c],
    [x, 0, c],
    [c, 0, x],
  ][sector]
  const hex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

/** HSL mix of two colors (shorter way round the hue circle); gray takes the other color's hue. */
function mix(from: string, to: string, f: number): string {
  const a = hexToHsl(from)
  const b = hexToHsl(to)
  const ha = Number.isNaN(a[0]) ? b[0] : a[0]
  const hb = Number.isNaN(b[0]) ? ha : b[0]
  if (Number.isNaN(ha)) return hslToHex([0, 0, a[2] + (b[2] - a[2]) * f])
  const dh = ((hb - ha + 540) % 360) - 180
  return hslToHex([(ha + dh * f + 360) % 360, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f])
}

/** The color at position `t` in [−1, 1]: slow → avg → fast. */
export function gradientColor(t: number, colors: Pick<SpeedColors, 'slow' | 'avg' | 'fast'>) {
  if (t === 0) return colors.avg
  return t < 0 ? mix(colors.avg, colors.slow, -t) : mix(colors.avg, colors.fast, t)
}

/** The 2 × steps + 1 colors from slow (index 0) through avg to fast. */
export function gradientPalette({ colors, gradientSteps }: SpeedColorSettings): string[] {
  return Array.from({ length: 2 * gradientSteps + 1 }, (_, i) =>
    gradientColor(quantize(i / gradientSteps - 1, gradientSteps), colors),
  )
}

/**
 * The track (or the points of `range`, inclusive) as runs of one color, split at segment gaps.
 * The line between points i and i + 1 takes the color of their mean speed, or `noSpeed` when either
 * has none; pairs with the same color step share a run, so the run count follows the color changes.
 */
export function getColorRuns(
  track: Track,
  { speed, avg, settings }: SpeedColoring,
  range?: PointRange,
): ColorRun[] {
  const palette = gradientPalette(settings)
  const steps = settings.gradientSteps
  const runs: ColorRun[] = []
  const at = (i: number): [number, number] => [track.points[i].lat, track.points[i].lon]
  for (const [start, end] of clipSegmentRanges(track, range)) {
    // Each segment starts a new run.
    let run: ColorRun | undefined
    for (let i = start; i + 1 < end; i++) {
      const a = speed[i]
      const b = speed[i + 1]
      const color =
        a === null || b === null
          ? settings.colors.noSpeed
          : palette[Math.round(speedPosition((a + b) / 2, avg, settings) * steps) + steps]
      if (!run || run.color !== color) {
        run = { color, latlngs: [at(i)] }
        runs.push(run)
      }
      run.latlngs.push(at(i + 1))
    }
  }
  return runs
}
