import { getTrackEntries } from '../compare/comparison.ts'
import type { TrackEntry } from '../compare/trackIds.ts'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { compareTooltipText, seriesName } from './compareOption.ts'
import type { TooltipParams } from './echarts.ts'
import { buildElevationCompareOption, buildElevationOption } from './elevationOption.ts'
import { buildSensorCompareOption, buildSensorOption } from './sensorOption.ts'
import { buildSpeedCompareOption, buildSpeedOption, paceAxisRange } from './speedOption.ts'

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

function pair(): [TrackEntry, TrackEntry] {
  const [a, b] = getTrackEntries([
    { fileName: 'run.gpx', track: parseTrack(run) },
    { fileName: 'run-b.gpx', track: parseTrack(runB) },
  ])
  return [a, b]
}

describe('buildSpeedCompareOption', () => {
  it('one series per track in its color, named for the legend; x-axis to the longer track', () => {
    const [a, b] = pair()
    const { option, lines } = buildSpeedCompareOption([a, b], a.metrics, 'distance', 'speed')
    const opt = option as any
    expect(opt.series.map((s: any) => [s.name, s.color])).toEqual([
      ['A · Run fixture', '#1d4ed8'],
      ['B · Run B fixture', '#ea580c'],
    ])
    // A is drawn above B.
    expect(opt.series[0].z).toBeGreaterThan(opt.series[1].z)
    expect(opt.series[0].data).toHaveLength(150)
    expect(opt.series[1].data).toHaveLength(130)
    expect(lines.a?.dataToPoint).toHaveLength(150)
    expect(lines.b?.dataToPoint).toHaveLength(130)
    expect(opt.xAxis.max).toBeCloseTo(a.metrics.totals.distance / 1000, 6)
    expect(opt.legend).toMatchObject({
      selectedMode: false,
      data: ['A · Run fixture', 'B · Run B fixture'],
    })
    // Room above the plot for the legend.
    expect(opt.grid.top).toBeGreaterThan(12)
  })

  it('pace: one inverted axis covering both tracks', () => {
    const [a, b] = pair()
    const opt = buildSpeedCompareOption([a, b], a.metrics, 'distance', 'pace').option as any
    const ys = opt.series.flatMap((s: any) => s.data.map((d: [number, number | null]) => d[1]))
    expect(opt.yAxis).toMatchObject({ inverse: true, ...paceAxisRange(ys) })
  })

  it('the single-track option has no legend and one series, as before', () => {
    const [a] = pair()
    const single = buildSpeedOption(a.track, a.metrics, 'distance', 'speed').option as any
    expect(single.legend).toBeUndefined()
    expect(single.series).toHaveLength(1)
    expect(single.series[0].name).toBeUndefined()
  })
})

describe('buildElevationCompareOption', () => {
  it('both tracks, without the area fill', () => {
    const [a, b] = pair()
    const opt = buildElevationCompareOption([a, b], a.metrics, 'distance').option as any
    expect(opt.series).toHaveLength(2)
    for (const s of opt.series) expect(s.areaStyle).toBeUndefined()
    // One track alone keeps its fill.
    expect(
      (buildElevationOption(a.track, a.metrics, 'distance').option as any).series[0].areaStyle,
    ).toBeDefined()
  })
})

describe('buildSensorCompareOption', () => {
  it('only the tracks passed in (those with the data)', () => {
    const [a, b] = pair()
    const hr = buildSensorCompareOption([a, b], a.metrics, 'distance', 'heartRate').option as any
    expect(hr.series.map((s: any) => s.name)).toEqual(['A · Run fixture', 'B · Run B fixture'])
    const cad = buildSensorCompareOption([a], a.metrics, 'distance', 'cadence').option as any
    expect(cad.series.map((s: any) => s.name)).toEqual(['A · Run fixture'])
    expect(cad.legend.data).toEqual(['A · Run fixture'])
    expect(
      (buildSensorOption(a.track, a.metrics, 'distance', 'cadence').option as any).legend,
    ).toBeUndefined()
  })
})

describe('compareTooltipText', () => {
  /** A line with these x values (one point each) and their y values. */
  const line = (xs: number[], ys: (number | null)[]) => ({
    line: {
      data: xs.map((x, i): [number, number | null] => [x, ys[i]]),
      dataToPoint: xs.map((_, i) => i),
    },
    ys,
  })
  const series = [
    { id: 'a' as const, ...line([0, 0.5, 1.0, 1.47], [10, null, 12.3, 13]) },
    { id: 'b' as const, ...line([0, 0.6, 1.2, 1.27], [9, 9.5, 11.8, 11]) },
  ]
  // ECharts lists only the series nearest the pointer; the text must not depend on that.
  const params = (x: number) =>
    [
      { seriesName: seriesName('a', 'Run'), axisValue: x, value: [x, 0] },
    ] as unknown as TooltipParams
  const kmh = (y: number) => `${y.toFixed(1)} km/h`

  it('the position, then each track’s value at it', () => {
    expect(compareTooltipText(params(1.2), series, 'distance', kmh)).toBe(
      '1.20 km · A 12.3 km/h · B 11.8 km/h',
    )
  })

  it('"–" past a track’s end, or where it has no value', () => {
    expect(compareTooltipText(params(1.4), series, 'distance', kmh)).toBe(
      '1.40 km · A 13.0 km/h · B –',
    )
    expect(compareTooltipText(params(0.45), series, 'distance', kmh)).toBe(
      '450 m · A – · B 9.5 km/h',
    )
  })

  it('elapsed time on the time axis; empty without an axis value', () => {
    const timed = [
      { id: 'a' as const, ...line([0, 60, 120], [10, 11, 12]) },
      { id: 'b' as const, ...line([0, 66, 132], [8, 9, 10]) },
    ]
    expect(compareTooltipText(params(65), timed, 'time', kmh)).toBe(
      '1:05 · A 11.0 km/h · B 9.0 km/h',
    )
    expect(compareTooltipText([] as unknown as TooltipParams, timed, 'time', kmh)).toBe('')
  })
})
