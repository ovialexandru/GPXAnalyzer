// Imperial units on the charts; the metric behavior is covered by each builder's own tests.
import { getTrackMetrics } from '../../metrics/index.ts'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { buildElevationOption } from './elevationOption.ts'
import type { TooltipParams } from './echarts.ts'
import { buildSensorOption } from './sensorOption.ts'
import { buildSpeedOption, PACE_AXIS_CAP_MI, paceAxisRange } from './speedOption.ts'
import { axisExtent, buildLineData, formatX, rangeToX, xOfPoint } from './xAxis.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

const track = parseTrack(run)
const metrics = getTrackMetrics(track)
const MILES = metrics.totals.distance / 1609.344

function tooltip(opt: any, value: [number, number | null]): string {
  return opt.tooltip.formatter([{ value, dataIndex: 0 }] as unknown as TooltipParams)
}

describe('imperial x-axis', () => {
  it('distance x values, extent and ranges are in miles', () => {
    const line = buildLineData(track, metrics, 'distance', [], 'imperial')
    expect(line.data.at(-1)![0]).toBeCloseTo(MILES, 9)
    expect(axisExtent(metrics, 'distance', 'imperial')[1]).toBeCloseTo(MILES, 9)
    expect(xOfPoint(metrics, 'distance', 149, 'imperial')).toBeCloseTo(MILES, 9)
    expect(rangeToX(metrics, 'distance', [0, 149], 'imperial')![1]).toBeCloseTo(MILES, 9)
  })

  it('the time axis is unchanged', () => {
    expect(axisExtent(metrics, 'time', 'imperial')).toEqual(axisExtent(metrics, 'time'))
  })

  it('labels and tooltips in mi', () => {
    const opt = buildElevationOption(track, metrics, 'distance', false, 'imperial').option as any
    expect(opt.xAxis.max).toBeCloseTo(MILES, 9)
    expect(opt.xAxis.axisLabel.formatter(0.5)).toBe('0.5 mi')
    expect(formatX(0.76, 'distance', 'imperial')).toBe('0.76 mi')
  })
})

describe('imperial y values', () => {
  it('elevation in feet', () => {
    const opt = buildElevationOption(track, metrics, 'distance', false, 'imperial').option as any
    expect(opt.series[0].data[0][1]).toBeCloseTo(track.points[0].ele! * 3.28084, 6)
    expect(opt.yAxis.axisLabel.formatter(240)).toBe('240 ft')
    expect(tooltip(opt, [0.5, 230])).toBe('0.50 mi · 230 ft')
  })

  it('speed in mph', () => {
    const opt = buildSpeedOption(track, metrics, 'distance', 'speed', false, 'imperial')
      .option as any
    const i = metrics.speed.findIndex((v) => v !== null)
    expect(opt.series[0].data[i][1]).toBeCloseTo((metrics.speed[i]! * 3600) / 1609.344, 9)
    expect(opt.yAxis.axisLabel.formatter(6)).toBe('6 mph')
    expect(tooltip(opt, [0.5, 7.64])).toBe('0.50 mi · 7.6 mph')
  })

  it('pace in min/mi, capped at 30', () => {
    const opt = buildSpeedOption(track, metrics, 'distance', 'pace', false, 'imperial')
      .option as any
    const i = metrics.pace.findIndex((v) => v !== null)
    expect(opt.series[0].data[i][1]).toBeCloseTo((metrics.pace[i]! * 1609.344) / 60, 9)
    expect(tooltip(opt, [0.5, 8.37])).toBe('0.50 mi · 8:22 /mi')
    expect(paceAxisRange([8, 45], PACE_AXIS_CAP_MI).max).toBe(30)
  })

  it('heart rate keeps bpm; only its x-axis changes', () => {
    const opt = buildSensorOption(track, metrics, 'distance', 'heartRate', false, 'imperial')
      .option as any
    expect(opt.series[0].data[0][1]).toBe(track.points[0].hr)
    expect(tooltip(opt, [0.5, 150])).toBe('0.50 mi · 150 bpm')
  })
})
