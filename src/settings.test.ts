import { COMPARE_COLORS, SPEED_COLORS } from './settings.ts'

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

describe('COMPARE_COLORS', () => {
  it('defaults: blue A (the plain track color) and orange B', () => {
    expect(COMPARE_COLORS).toEqual({ a: '#1d4ed8', b: '#ea580c' })
  })

  it('colors are #rrggbb and differ', () => {
    expect(COMPARE_COLORS.a).toMatch(/^#[0-9a-f]{6}$/i)
    expect(COMPARE_COLORS.b).toMatch(/^#[0-9a-f]{6}$/i)
    expect(COMPARE_COLORS.a.toLowerCase()).not.toBe(COMPARE_COLORS.b.toLowerCase())
  })
})
