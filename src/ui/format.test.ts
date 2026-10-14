import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatPace,
  formatSpeed,
} from './format.ts'

describe('formatDistance', () => {
  it.each([
    [0, '0 m'],
    [850, '850 m'],
    [999, '999 m'],
    [999.6, '1.00 km'],
    [1000, '1.00 km'],
    [2519.1, '2.52 km'],
    [39_390.7, '39.39 km'],
  ])('%f → %s', (meters, text) => {
    expect(formatDistance(meters)).toBe(text)
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [59.6, '1:00'],
    [644, '10:44'],
    [717, '11:57'],
    [3600, '1:00:00'],
    [3723, '1:02:03'],
  ])('%f → %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })
})

describe('formatElevation', () => {
  it.each([
    [22.4, '22 m'],
    [17.6, '18 m'],
    [0, '0 m'],
  ])('%f → %s', (meters, text) => {
    expect(formatElevation(meters)).toBe(text)
  })
})

describe('formatSpeed', () => {
  it.each([
    [0, '0.0 km/h'],
    [3.4167, '12.3 km/h'],
  ])('%f m/s → %s', (speed, text) => {
    expect(formatSpeed(speed)).toBe(text)
  })
})

describe('formatPace', () => {
  it.each([
    [0.312, '5:12 /km'],
    [0.3, '5:00 /km'],
    [0.29999, '5:00 /km'],
    [0.2999, '5:00 /km'],
  ])('%f s/m → %s (never x:60)', (pace, text) => {
    expect(formatPace(pace)).toBe(text)
  })
})
