import { getTrackMetrics } from '../../metrics/index.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { buildBrush } from './brushOption.ts'
import { COLORS } from './chartTheme.ts'
import type { TooltipParams } from './echarts.ts'
import { buildSensorOption, type SensorKind } from './sensorOption.ts'
import type { XAxisMode } from './xAxis.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

function option(text: string, kind: SensorKind, mode: XAxisMode = 'distance', slider = false) {
  const track = parseTrack(text)
  const metrics = getTrackMetrics(track)
  return { track, option: buildSensorOption(track, metrics, mode, kind, slider).option as any }
}

function tooltip(opt: any, value: [number, number | null]): string {
  return opt.tooltip.formatter([{ value, dataIndex: 0 }] as unknown as TooltipParams)
}

describe('buildSensorOption', () => {
  it.each([
    ['heartRate', 'hr', COLORS.heartRate],
    ['cadence', 'cad', COLORS.cadence],
  ] as const)('run.gpx %s: raw samples per point, its color', (kind, field, color) => {
    const { track, option: opt } = option(run, kind)
    const data: [number, number | null][] = opt.series[0].data
    expect(data).toHaveLength(150)
    data.forEach(([, y], i) => expect(y).toBe(track.points[i][field]))
    expect(opt.series[0].color).toBe(color)
  })

  it('y axis not forced to 0, whole-number labels with units', () => {
    const hr = option(run, 'heartRate').option
    expect(hr.yAxis).toMatchObject({ type: 'value', scale: true })
    expect(hr.yAxis.axisLabel.formatter(150)).toBe('150 bpm')
    const cad = option(run, 'cadence').option
    expect(cad.yAxis.axisLabel.formatter(80)).toBe('80 rpm')
  })

  it('tooltips: "distance · bpm" and "distance · rpm"', () => {
    expect(tooltip(option(run, 'heartRate').option, [1.234, 151.6])).toBe('1.23 km · 152 bpm')
    expect(tooltip(option(run, 'cadence').option, [0.85, 82])).toBe('850 m · 82 rpm')
  })

  it('a point without a sample is a gap', () => {
    const track = parseTrack(run)
    delete track.points[20].hr
    const opt = buildSensorOption(track, getTrackMetrics(track), 'distance', 'heartRate')
      .option as any
    expect(opt.series[0].data[20][1]).toBeNull()
    expect(opt.series[0].connectNulls).toBe(false)
  })

  it('bike.gpx on the time axis: a break between the segments', () => {
    const { track, option: opt } = option(bike, 'heartRate', 'time')
    expect(opt.xAxis).toMatchObject({ min: 0, max: 717 })
    expect(opt.series[0].data).toHaveLength(201)
    expect(opt.series[0].data[track.segmentStarts[1]][1]).toBeNull()
    expect(tooltip(opt, [644, 160])).toBe('10:44 · 160 bpm')
  })

  it('zoomable and brushable like the other charts', () => {
    expect(option(run, 'cadence').option.dataZoom.map((z: any) => z.type)).toEqual(['inside'])
    const withSlider = option(run, 'cadence', 'distance', true).option
    expect(withSlider.dataZoom.map((z: any) => z.type)).toEqual(['inside', 'slider'])
    expect(withSlider.brush).toEqual(buildBrush())
  })
})
