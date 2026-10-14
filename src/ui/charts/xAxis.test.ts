import { getTrackMetrics } from '../../metrics/index.ts'
import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import {
  buildLineData,
  buildXAxis,
  formatX,
  niceTimeInterval,
  pointAtX,
  xOfPoint,
} from './xAxis.ts'

function fixture(text: string) {
  const track = parseTrack(text)
  return { track, metrics: getTrackMetrics(track) }
}

const indexYs = (n: number) => Array.from({ length: n }, (_, i) => i)

describe('buildLineData', () => {
  it('distance mode: one item per point in km, identity mapping, no breaks', () => {
    const { track, metrics } = fixture(bike)
    const { data, dataToPoint } = buildLineData(track, metrics, 'distance', indexYs(200))
    expect(data).toHaveLength(200)
    expect(dataToPoint).toEqual(indexYs(200))
    expect(data[0]).toEqual([0, 0])
    expect(data[199][0]).toBeCloseTo(2.5191, 3)
    expect(data.every(([, y]) => y !== null)).toBe(true)
  })

  it('time mode, run.gpx: 150 items from 0 to 644 s', () => {
    const { track, metrics } = fixture(run)
    const { data, dataToPoint } = buildLineData(track, metrics, 'time', indexYs(150))
    expect(data).toHaveLength(150)
    expect(data[0][0]).toBe(0)
    expect(data[149][0]).toBe(644)
    expect(dataToPoint).toEqual(indexYs(150))
  })

  it('time mode, bike.gpx: exactly one null break between the segments', () => {
    const { track, metrics } = fixture(bike)
    const ys = indexYs(200)
    const { data, dataToPoint } = buildLineData(track, metrics, 'time', ys)
    expect(data).toHaveLength(201)
    const breaks = data.flatMap(([, y], i) => (y === null ? [i] : []))
    expect(breaks).toHaveLength(1)
    const b = breaks[0]
    expect(dataToPoint[b]).toBe(-1)
    expect(b).toBe(track.segmentStarts[1])
    // The break sits inside the pause.
    expect(data[b][0]).toBeGreaterThan(data[b - 1][0])
    expect(data[b][0]).toBeLessThan(data[b + 1][0])
    // Every other item maps back to its point: y was the point index, x its elapsed time.
    dataToPoint.forEach((p, i) => {
      if (p === -1) return
      expect(data[i]).toEqual([metrics.elapsed[p], p])
    })
  })

  it('time mode skips points without time', () => {
    const { track, metrics } = fixture(run)
    const elapsed = [...metrics.elapsed]
    elapsed[10] = null
    const { data, dataToPoint } = buildLineData(
      track,
      { ...metrics, elapsed },
      'time',
      indexYs(150),
    )
    expect(data).toHaveLength(149)
    expect(dataToPoint).not.toContain(10)
  })
})

describe('pointAtX', () => {
  it('distance axis: exact x, between points, and beyond either end', () => {
    const { track, metrics } = fixture(run)
    const line = buildLineData(track, metrics, 'distance', indexYs(150))
    const km = (i: number) => metrics.distance[i] / 1000
    expect(pointAtX(line, km(40))).toBe(40)
    expect(pointAtX(line, km(40) + (km(41) - km(40)) * 0.3)).toBe(40)
    expect(pointAtX(line, km(40) + (km(41) - km(40)) * 0.7)).toBe(41)
    expect(pointAtX(line, -1)).toBe(0)
    expect(pointAtX(line, 999)).toBe(149)
  })

  it('time axis on bike.gpx: an x inside the segment break gives the nearest real point', () => {
    const { track, metrics } = fixture(bike)
    const line = buildLineData(track, metrics, 'time', indexYs(200))
    const b = line.dataToPoint.indexOf(-1)
    const [breakX] = line.data[b]
    const lastOfFirst = line.dataToPoint[b - 1]
    const firstOfSecond = line.dataToPoint[b + 1]
    expect(pointAtX(line, breakX)).not.toBe(-1)
    expect([lastOfFirst, firstOfSecond]).toContain(pointAtX(line, breakX))
    expect(pointAtX(line, line.data[b - 1][0] + 0.1)).toBe(lastOfFirst)
    expect(pointAtX(line, line.data[b + 1][0] - 0.1)).toBe(firstOfSecond)
    for (let x = 0; x <= 717; x += 3) expect(pointAtX(line, x)).toBeGreaterThanOrEqual(0)
  })

  it('no data gives null', () => {
    expect(pointAtX({ data: [], dataToPoint: [] }, 1)).toBeNull()
  })
})

describe('xOfPoint', () => {
  it('distance axis gives km; time axis gives elapsed seconds', () => {
    const { metrics } = fixture(run)
    expect(xOfPoint(metrics, 'distance', 149)).toBeCloseTo(1.469, 3)
    expect(xOfPoint(metrics, 'time', 149)).toBe(644)
    expect(xOfPoint(metrics, 'distance', 0)).toBe(0)
  })

  it('a point without time is not on the time axis (no-ele-time.gpx)', () => {
    const { metrics } = fixture(noEleTime)
    expect(xOfPoint(metrics, 'time', 10)).toBeNull()
    expect(xOfPoint(metrics, 'distance', 10)).toBeGreaterThan(0)
  })

  it('an index outside the track gives null', () => {
    const { metrics } = fixture(run)
    expect(xOfPoint(metrics, 'distance', 150)).toBeNull()
    expect(xOfPoint(metrics, 'time', 150)).toBeNull()
  })
})

describe('niceTimeInterval', () => {
  it.each([
    [644, 120],
    [2523, 600],
    [7731, 1800],
    [0, 60],
    [100_000, 21_600],
  ])('%i s → %i s', (duration, interval) => {
    expect(niceTimeInterval(duration)).toBe(interval)
  })
})

describe('buildXAxis', () => {
  it('distance: km from 0 to the total', () => {
    const { metrics } = fixture(run)
    const axis = buildXAxis(metrics, 'distance')
    expect(axis).toMatchObject({ type: 'value', min: 0 })
    expect(axis.max).toBeCloseTo(1.469, 3)
    const formatter = (axis.axisLabel as { formatter: (v: number) => string }).formatter
    expect(formatter(2.5)).toBe('2.5 km')
    expect(formatter(1)).toBe('1 km')
  })

  it('time: seconds from 0 to the duration at a nice interval', () => {
    const { metrics } = fixture(run)
    const axis = buildXAxis(metrics, 'time')
    expect(axis).toMatchObject({ type: 'value', min: 0, max: 644, interval: 120 })
    const formatter = (axis.axisLabel as { formatter: (v: number) => string }).formatter
    expect(formatter(600)).toBe('10:00')
    expect(formatter(3600)).toBe('1:00:00')
  })
})

describe('formatX', () => {
  it('formats km as a distance and seconds as a duration', () => {
    expect(formatX(1.234, 'distance')).toBe('1.23 km')
    expect(formatX(644, 'time')).toBe('10:44')
  })
})
