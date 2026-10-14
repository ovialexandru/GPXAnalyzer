import { getTrackMetrics } from '../../metrics/index.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { SLIDER_SPACE } from './chartTheme.ts'
import { buildElevationOption } from './elevationOption.ts'
import type { TooltipParams } from './echarts.ts'
import type { XAxisMode } from './xAxis.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

function option(text: string, mode: XAxisMode = 'distance') {
  const track = parseTrack(text)
  const metrics = getTrackMetrics(track)
  return { track, metrics, option: buildElevationOption(track, metrics, mode).option as any }
}

function tooltip(opt: any, value: [number, number | null]): string {
  return opt.tooltip.formatter([{ value, dataIndex: 0 }] as unknown as TooltipParams)
}

describe('buildElevationOption', () => {
  it('run.gpx: one series with a [km, m] pair per point', () => {
    const { track, option: opt } = option(run)
    expect(opt.series).toHaveLength(1)
    const data: [number, number][] = opt.series[0].data
    expect(data).toHaveLength(150)
    expect(data[0][0]).toBe(0)
    expect(data[149][0]).toBeCloseTo(1.469, 3)
    data.forEach(([, y], i) => expect(y).toBe(track.points[i].ele))
  })

  it('axes: x from 0 to the total km, y not forced to 0', () => {
    const { option: opt } = option(run)
    expect(opt.xAxis).toMatchObject({ type: 'value', min: 0 })
    expect(opt.xAxis.max).toBeCloseTo(1.469, 3)
    expect(opt.yAxis).toMatchObject({ type: 'value', scale: true })
    expect(opt.yAxis.axisLabel.formatter(245.4)).toBe('245 m')
  })

  it('a point without elevation becomes null and the line is not connected across it', () => {
    const track = parseTrack(run)
    delete track.points[20].ele
    const opt = buildElevationOption(track, getTrackMetrics(track), 'distance').option as any
    expect(opt.series[0].data[20][1]).toBeNull()
    expect(opt.series[0].connectNulls).toBe(false)
  })

  it('is fast for large tracks: LTTB sampling, no symbols, no animation', () => {
    const { option: opt } = option(run)
    expect(opt.animation).toBe(false)
    expect(opt.series[0]).toMatchObject({
      type: 'line',
      sampling: 'lttb',
      showSymbol: false,
      areaStyle: expect.any(Object),
    })
  })

  it('tooltip shows distance and elevation', () => {
    const { option: opt } = option(run)
    expect(opt.tooltip.trigger).toBe('axis')
    expect(tooltip(opt, [1.234, 245.2])).toBe('1.23 km · 245 m')
    expect(tooltip(opt, [0.85, 70])).toBe('850 m · 70 m')
  })

  it('time mode: elapsed-time axis, tooltip with time, break between bike.gpx segments', () => {
    const { track, option: opt } = option(bike, 'time')
    expect(opt.xAxis).toMatchObject({ min: 0, max: 717 })
    const data: [number, number | null][] = opt.series[0].data
    expect(data).toHaveLength(201)
    expect(data[track.segmentStarts[1]][1]).toBeNull()
    expect(tooltip(opt, [644, 72])).toBe('10:44 · 72 m')
  })

  it('zoomable: inside zoom only, or with the slider and room for it under the plot', () => {
    const track = parseTrack(run)
    const metrics = getTrackMetrics(track)
    const plain = buildElevationOption(track, metrics, 'distance').option as any
    expect(plain.dataZoom.map((z: any) => z.type)).toEqual(['inside'])
    expect(plain.grid.bottom).toBe(28)

    const withSlider = buildElevationOption(track, metrics, 'distance', true).option as any
    expect(withSlider.dataZoom.map((z: any) => z.type)).toEqual(['inside', 'slider'])
    expect(withSlider.grid.bottom).toBe(28 + SLIDER_SPACE)
    expect(withSlider.grid.left).toBe(plain.grid.left)
  })
})
