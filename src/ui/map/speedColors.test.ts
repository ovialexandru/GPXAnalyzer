import type { Track } from '../../model/index.ts'
import { SPEED_COLORS, type SpeedColorSettings } from '../../settings.ts'
import { constantSpeedPoints, linePoints } from '../../test/tracks.ts'
import {
  getColorRuns,
  gradientColor,
  gradientPalette,
  quantize,
  speedPosition,
  speedThresholds,
} from './speedColors.ts'

const { colors } = SPEED_COLORS

/** Hue in degrees of a #rrggbb color. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const max = Math.max(r, g, b)
  const d = max - Math.min(r, g, b)
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return h * 60
}

function track(n: number, segmentStarts = [0]): Track {
  return { points: constantSpeedPoints(n, 1), segmentStarts }
}

/** Speed coloring with avg 10 m/s and the default settings (palette index = 16 + 16 t). */
function coloring(speed: (number | null)[], settings: SpeedColorSettings = SPEED_COLORS) {
  return { speed, avg: 10, settings }
}

describe('speedThresholds', () => {
  it('avg ± 25% by default', () => {
    expect(speedThresholds(10, SPEED_COLORS)).toEqual({ lower: 7.5, upper: 12.5 })
  })

  it('separate fractions below and above', () => {
    expect(speedThresholds(10, { below: 0.1, above: 0.5 })).toEqual({ lower: 9, upper: 15 })
  })
})

describe('speedPosition', () => {
  it('0 at avg, ±1 at the thresholds, linear in between', () => {
    expect(speedPosition(10, 10, SPEED_COLORS)).toBe(0)
    expect(speedPosition(7.5, 10, SPEED_COLORS)).toBe(-1)
    expect(speedPosition(12.5, 10, SPEED_COLORS)).toBe(1)
    expect(speedPosition(8.75, 10, SPEED_COLORS)).toBeCloseTo(-0.5)
    expect(speedPosition(11.25, 10, SPEED_COLORS)).toBeCloseTo(0.5)
  })

  it('clamped beyond the thresholds; stopped is fully slow', () => {
    expect(speedPosition(0, 10, SPEED_COLORS)).toBe(-1)
    expect(speedPosition(3, 10, SPEED_COLORS)).toBe(-1)
    expect(speedPosition(40, 10, SPEED_COLORS)).toBe(1)
  })

  it('uses the settings’ fractions', () => {
    expect(speedPosition(9, 10, { below: 0.1, above: 0.5 })).toBe(-1)
    expect(speedPosition(15, 10, { below: 0.1, above: 0.5 })).toBe(1)
  })
})

describe('quantize', () => {
  it('rounds to steps per side', () => {
    expect(quantize(0.49, 2)).toBe(0.5)
    expect(quantize(-0.2, 2)).toBe(0)
    expect(quantize(-0.3, 2)).toBe(-0.5)
    expect(quantize(1, 16)).toBe(1)
  })
})

describe('gradientColor', () => {
  it('the stop colors at −1, 0 and 1', () => {
    expect(gradientColor(-1, colors)).toBe(colors.slow)
    expect(gradientColor(0, colors)).toBe(colors.avg)
    expect(gradientColor(1, colors)).toBe(colors.fast)
  })

  it('slow → avg passes through orange and yellow, not brown', () => {
    expect(hue(gradientColor(-0.75, colors))).toBeGreaterThan(20)
    expect(hue(gradientColor(-0.75, colors))).toBeLessThan(45)
    expect(hue(gradientColor(-0.5, colors))).toBeGreaterThan(55)
    expect(hue(gradientColor(-0.5, colors))).toBeLessThan(85)
    // Bright, not muddy: the strongest channel stays high.
    const mid = gradientColor(-0.5, colors)
    expect(Math.max(...[1, 3, 5].map((i) => parseInt(mid.slice(i, i + 2), 16)))).toBeGreaterThan(
      150,
    )
  })

  it('avg → fast passes through teal', () => {
    expect(hue(gradientColor(0.5, colors))).toBeGreaterThan(165)
    expect(hue(gradientColor(0.5, colors))).toBeLessThan(200)
  })

  it('a gray stop takes the other color’s hue', () => {
    const color = gradientColor(1, { ...colors, fast: '#808080' })
    expect(color).toBe('#808080')
    expect(gradientColor(0.5, { slow: '#000000', avg: '#000000', fast: '#ffffff' })).toBe('#808080')
  })
})

describe('gradientPalette', () => {
  it('2 × steps + 1 colors from slow through avg to fast', () => {
    const palette = gradientPalette(SPEED_COLORS)
    expect(palette).toHaveLength(33)
    expect(palette[0]).toBe(colors.slow)
    expect(palette[16]).toBe(colors.avg)
    expect(palette[32]).toBe(colors.fast)
    expect(new Set(palette).size).toBe(33)
  })
})

describe('getColorRuns', () => {
  const palette = gradientPalette(SPEED_COLORS)

  it('same-step pairs share one run with all their points', () => {
    const t = track(5)
    const runs = getColorRuns(t, coloring([10, 10, 10, 10, 10]))
    expect(runs).toEqual([{ color: colors.avg, latlngs: t.points.map((p) => [p.lat, p.lon]) }])
  })

  it('a pair takes the color of its mean speed; runs share their boundary point', () => {
    const t = track(4)
    // Pair means: 10 (avg), 12.5 (fast), 15 (fast, clamped).
    const runs = getColorRuns(t, coloring([10, 10, 15, 15]))
    expect(runs.map((r) => r.color)).toEqual([colors.avg, colors.fast])
    expect(runs.map((r) => r.latlngs.length)).toEqual([2, 3])
    expect(runs[0].latlngs[1]).toEqual(runs[1].latlngs[0])
  })

  it('in-between speeds take the quantized gradient color', () => {
    // Mean 8.75 → t = −0.5 → palette index 8.
    const runs = getColorRuns(track(2), coloring([8.75, 8.75]))
    expect(runs[0].color).toBe(palette[8])
  })

  it('stopped stretches are slow-colored', () => {
    expect(getColorRuns(track(2), coloring([0, 0]))[0].color).toBe(colors.slow)
  })

  it('pairs with a point without speed are gray', () => {
    const runs = getColorRuns(track(4), coloring([10, null, 10, 10]))
    expect(runs.map((r) => r.color)).toEqual([colors.noSpeed, colors.avg])
    expect(runs.map((r) => r.latlngs.length)).toEqual([3, 2])
  })

  it('segment gaps are not bridged, even in the same color', () => {
    const t = track(6, [0, 3])
    const runs = getColorRuns(t, coloring(new Array(6).fill(10)))
    expect(runs.map((r) => r.latlngs.length)).toEqual([3, 3])
    expect(runs[1].latlngs[0]).toEqual([t.points[3].lat, t.points[3].lon])
  })

  it('a range: only its points, clipped at segment gaps', () => {
    const t = track(10, [0, 5])
    const runs = getColorRuns(t, coloring(new Array(10).fill(10)), [3, 6])
    expect(runs.map((r) => r.latlngs)).toEqual([
      t.points.slice(3, 5).map((p) => [p.lat, p.lon]),
      t.points.slice(5, 7).map((p) => [p.lat, p.lon]),
    ])
  })

  it('fewer than 2 points: no runs', () => {
    expect(getColorRuns(track(1), coloring([10]))).toEqual([])
    expect(getColorRuns({ points: [], segmentStarts: [0] }, coloring([]))).toEqual([])
  })

  it('uses the settings’ colors and steps', () => {
    const settings = { ...SPEED_COLORS, gradientSteps: 1, colors: { ...colors, avg: '#00ff00' } }
    const runs = getColorRuns(track(3), coloring([9, 9, 9], settings))
    // t = −0.4 rounds to 0 with one step per side.
    expect(runs[0].color).toBe('#00ff00')
  })

  it('50 000 points: the run count follows color changes, not points', () => {
    const n = 50_000
    const meters = Array.from({ length: n }, (_, i) => i * 3)
    const t: Track = {
      points: linePoints(
        meters,
        meters.map((_, i) => i),
      ),
      segmentStarts: [0],
    }
    // A slow ramp from 5 to 15 m/s and back: every step is crossed twice.
    const speed = meters.map((_, i) => 10 - 5 * Math.cos((2 * Math.PI * i) / n))
    const started = performance.now()
    const runs = getColorRuns(t, coloring(speed))
    expect(performance.now() - started).toBeLessThan(1000)
    expect(runs.length).toBeLessThanOrEqual(2 * 33)
    expect(runs.reduce((sum, r) => sum + r.latlngs.length, 0)).toBe(n + runs.length - 1)
  })
})
