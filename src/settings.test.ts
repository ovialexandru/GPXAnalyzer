import { SPEED_COLORS } from './settings.ts'

describe('SPEED_COLORS', () => {
  it('defaults match the roadmap: avg ± 25%, red / green / blue', () => {
    expect(SPEED_COLORS.below).toBe(0.25)
    expect(SPEED_COLORS.above).toBe(0.25)
    expect(SPEED_COLORS.colors).toMatchObject({
      slow: '#dc2626',
      avg: '#16a34a',
      fast: '#2563eb',
    })
  })

  it('thresholds, window and steps are in range', () => {
    expect(SPEED_COLORS.below).toBeGreaterThan(0)
    expect(SPEED_COLORS.below).toBeLessThan(1)
    expect(SPEED_COLORS.above).toBeGreaterThan(0)
    expect(SPEED_COLORS.smoothingSeconds).toBeGreaterThan(0)
    expect(Number.isInteger(SPEED_COLORS.gradientSteps)).toBe(true)
    expect(SPEED_COLORS.gradientSteps).toBeGreaterThanOrEqual(1)
  })

  it('colors are #rrggbb', () => {
    for (const color of Object.values(SPEED_COLORS.colors)) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
})
