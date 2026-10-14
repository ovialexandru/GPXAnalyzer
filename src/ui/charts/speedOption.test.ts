import { getTrackMetrics, type TrackMetrics } from '../../metrics/index.ts'
import type { Track } from '../../model/index.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { linePoints, parseTrack } from '../../test/tracks.ts'
import type { TooltipParams } from './echarts.ts'
import { buildSpeedOption, PACE_AXIS_CAP, paceAxisRange, type SpeedMetric } from './speedOption.ts'
import type { XAxisMode } from './xAxis.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

function build(track: Track, metrics: TrackMetrics, mode: XAxisMode, metric: SpeedMetric) {
  return buildSpeedOption(track, metrics, mode, metric).option as any
}

function fixture(text: string) {
  const track = parseTrack(text)
  return { track, metrics: getTrackMetrics(track) }
}

function tooltip(opt: any, value: [number, number | null]): string {
  return opt.tooltip.formatter([{ value, dataIndex: 0 }] as unknown as TooltipParams)
}

/** 4 m/s for 10 s, stopped for 10 s, 4 m/s again (points 1 s apart). */
function stopAndGo(): Track {
  const meters: number[] = []
  for (let i = 0; i < 30; i++) meters.push(i < 10 ? i * 4 : i < 20 ? 36 : 36 + (i - 19) * 4)
  return {
    points: linePoints(
      meters,
      meters.map((_, i) => i),
    ),
    segmentStarts: [0],
  }
}

describe('buildSpeedOption', () => {
  it('speed: km/h values, axis from 0', () => {
    const { track, metrics } = fixture(run)
    const opt = build(track, metrics, 'distance', 'speed')
    const data: [number, number | null][] = opt.series[0].data
    expect(data).toHaveLength(150)
    data.forEach(([, y], i) => expect(y).toBeCloseTo(metrics.speed[i]! * 3.6, 9))
    expect(opt.yAxis).toMatchObject({ type: 'value', min: 0 })
    expect(opt.yAxis.inverse).toBeUndefined()
    expect(opt.series[0].areaStyle).toBeUndefined()
  })

  it('pace: min/km values on an inverted axis capped at 20:00', () => {
    const { track, metrics } = fixture(run)
    const opt = build(track, metrics, 'distance', 'pace')
    const data: [number, number | null][] = opt.series[0].data
    data.forEach(([, y], i) => {
      const pace = metrics.pace[i]
      if (pace === null) expect(y).toBeNull()
      else expect(y).toBeCloseTo((pace * 1000) / 60, 9)
    })
    expect(opt.yAxis.inverse).toBe(true)
    expect(opt.yAxis.max).toBeLessThanOrEqual(PACE_AXIS_CAP)
    expect(PACE_AXIS_CAP).toBe(20)
    expect(opt.yAxis.axisLabel.formatter(5.2)).toBe('5:12')
  })

  it('stopped points: speed 0, pace null, lines not connected', () => {
    const track = stopAndGo()
    const metrics = getTrackMetrics(track)
    const speed = build(track, metrics, 'time', 'speed')
    const pace = build(track, metrics, 'time', 'pace')
    expect(speed.series[0].data[15][1]).toBe(0)
    expect(pace.series[0].data[15][1]).toBeNull()
    expect(pace.series[0].data[5][1]).toBeCloseTo(1000 / 4 / 60, 6)
    expect(speed.series[0].connectNulls).toBe(false)
    expect(pace.series[0].connectNulls).toBe(false)
  })

  it.each(['speed', 'pace'] as const)('%s keeps the large-track settings', (metric) => {
    const { track, metrics } = fixture(run)
    const opt = build(track, metrics, 'distance', metric)
    expect(opt.animation).toBe(false)
    expect(opt.series[0]).toMatchObject({ sampling: 'lttb', showSymbol: false })
  })

  it('time mode: break between the bike.gpx segments', () => {
    const { track, metrics } = fixture(bike)
    const opt = build(track, metrics, 'time', 'speed')
    expect(opt.series[0].data).toHaveLength(201)
    expect(opt.series[0].data[track.segmentStarts[1]][1]).toBeNull()
    expect(opt.xAxis).toMatchObject({ min: 0, max: 717 })
  })

  it.each([
    ['distance', 'speed', [1.234, 12.3], '1.23 km · 12.3 km/h'],
    ['distance', 'pace', [1.234, 5.2], '1.23 km · 5:12 /km'],
    ['time', 'speed', [644, 12.3], '10:44 · 12.3 km/h'],
    ['time', 'pace', [644, 5.2], '10:44 · 5:12 /km'],
    ['time', 'pace', [400, null], '6:40 · –'],
  ] as const)('tooltip in %s mode for %s', (mode, metric, value, text) => {
    const { track, metrics } = fixture(run)
    expect(tooltip(build(track, metrics, mode, metric), [...value])).toBe(text)
  })
})

describe('paceAxisRange', () => {
  it('round range with at most ~6 steps', () => {
    expect(paceAxisRange([4.6, 5.2, 6.1, null])).toEqual({ min: 4.5, max: 6.5, interval: 0.5 })
    expect(paceAxisRange([4.2, 9.7])).toEqual({ min: 4, max: 10, interval: 1 })
  })

  it('caps the slow end at 20:00', () => {
    expect(paceAxisRange([2.4, 27.8])).toEqual({ min: 0, max: 20, interval: 5 })
  })

  it('a single value still gets a non-empty range', () => {
    expect(paceAxisRange([5])).toEqual({ min: 5, max: 5.5, interval: 0.5 })
  })

  it('no pace at all: 0–20', () => {
    expect(paceAxisRange([null, null])).toEqual({ min: 0, max: 20, interval: 5 })
  })
})
