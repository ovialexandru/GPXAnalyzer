import bike from '../test/fixtures/bike.gpx?raw'
import noEleTime from '../test/fixtures/no-ele-time.gpx?raw'
import run from '../test/fixtures/run.gpx?raw'
import type { Track } from '../model/index.ts'
import { parseGpx, type GpxErrorCode } from './index.ts'

function ok(text: string): Track {
  const result = parseGpx(text)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.track
}

function expectError(text: string, code: GpxErrorCode) {
  const result = parseGpx(text)
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error.code).toBe(code)
  expect(result.error.message.trim()).not.toBe('')
}

const GPX11 = 'http://www.topografix.com/GPX/1/1'

function gpx(body: string, ns = GPX11): string {
  const xmlns = ns ? ` xmlns="${ns}"` : ''
  return `<?xml version="1.0"?><gpx version="1.1"${xmlns}>${body}</gpx>`
}

function trk(...segments: string[]): string {
  return `<trk>${segments.map((s) => `<trkseg>${s}</trkseg>`).join('')}</trk>`
}

function pt(lat: string | null, lon: string | null, inner = ''): string {
  const attrs = (lat === null ? '' : ` lat="${lat}"`) + (lon === null ? '' : ` lon="${lon}"`)
  return `<trkpt${attrs}>${inner}</trkpt>`
}

describe('fixtures', () => {
  it('run.gpx: 150 points, one segment, all fields present', () => {
    const track = ok(run)
    expect(track.name).toBe('Run fixture')
    expect(track.points).toHaveLength(150)
    expect(track.segmentStarts).toEqual([0])
    for (const p of track.points) {
      expect(Object.keys(p).sort()).toEqual(['cad', 'ele', 'hr', 'lat', 'lon', 'time'])
    }
  })

  it('run.gpx: first point matches the file exactly', () => {
    expect(ok(run).points[0]).toEqual({
      lat: Number('44.4206017814576625823974609375'),
      lon: Number('26.15519978106021881103515625'),
      ele: 70,
      time: Date.UTC(2026, 8, 29, 18, 9, 6),
      hr: 149,
      cad: 75,
    })
  })

  it('bike.gpx: 200 points, two segments, HR but no cadence', () => {
    const track = ok(bike)
    expect(track.name).toBe('Bike fixture')
    expect(track.points).toHaveLength(200)
    expect(track.segmentStarts).toEqual([0, 100])
    for (const p of track.points) {
      expect(p.hr).toEqual(expect.any(Number))
      expect(p).not.toHaveProperty('cad')
    }
  })

  it('no-ele-time.gpx: 80 points with only lat/lon', () => {
    const track = ok(noEleTime)
    expect(track.name).toBe('No elevation or time fixture')
    expect(track.points).toHaveLength(80)
    for (const p of track.points) {
      expect(Object.keys(p).sort()).toEqual(['lat', 'lon'])
    }
  })
})

describe('document errors', () => {
  it.each([
    ['plain text', 'hello'],
    ['empty string', ''],
    ['truncated GPX', gpx(trk(pt('1', '2'))).slice(0, -10)],
  ])('%s -> invalid-xml', (_, text) => expectError(text, 'invalid-xml'))

  it('wrong root -> not-gpx', () => {
    expectError('<?xml version="1.0"?><kml/>', 'not-gpx')
  })

  it.each([
    ['no trk', gpx('<wpt lat="1" lon="2"/>')],
    ['only empty trksegs', gpx(trk('', ''))],
    ['only invalid points', gpx(trk(pt(null, '2') + pt('abc', '2') + pt('91', '2')))],
  ])('%s -> no-points', (_, text) => expectError(text, 'no-points'))
})

describe('segments', () => {
  it('concatenates multiple trk elements and skips empty segments', () => {
    const track = ok(
      gpx(
        trk(pt('1', '1') + pt('2', '2'), '') +
          trk(pt('bad', '3'), pt('3', '3')) +
          trk(pt('4', '4') + pt('5', '5')),
      ),
    )
    expect(track.points.map((p) => p.lat)).toEqual([1, 2, 3, 4, 5])
    expect(track.segmentStarts).toEqual([0, 2, 3])
  })
})

describe('names', () => {
  it('prefers the first trk name, trimmed', () => {
    const text = gpx(
      `<metadata><name>Meta</name></metadata>` +
        `<trk><name>  First  </name><trkseg>${pt('1', '1')}</trkseg></trk>` +
        `<trk><name>Second</name></trk>`,
    )
    expect(ok(text).name).toBe('First')
  })

  it('falls back to metadata name', () => {
    expect(ok(gpx(`<metadata><name>Meta</name></metadata>${trk(pt('1', '1'))}`)).name).toBe('Meta')
  })

  it('omits an empty or missing name', () => {
    expect(ok(gpx(`<trk><name> </name><trkseg>${pt('1', '1')}</trkseg></trk>`))).not.toHaveProperty(
      'name',
    )
    expect(ok(gpx(trk(pt('1', '1'))))).not.toHaveProperty('name')
  })
})

describe('points', () => {
  it('skips points with bad lat/lon and keeps the rest', () => {
    const track = ok(
      gpx(
        trk(
          pt(null, '1') +
            pt('1', null) +
            pt('abc', '1') +
            pt('', '1') +
            pt('91', '1') +
            pt('1', '-181') +
            pt('-90', '180') +
            pt(' 45.5 ', '-12'),
        ),
      ),
    )
    expect(track.points).toEqual([
      { lat: -90, lon: 180 },
      { lat: 45.5, lon: -12 },
    ])
  })

  it('omits bad optional fields but keeps the point', () => {
    const inner =
      '<ele>high</ele><time>yesterday</time>' +
      '<extensions><TrackPointExtension><hr>-5</hr><cad></cad></TrackPointExtension></extensions>'
    expect(ok(gpx(trk(pt('1', '2', inner)))).points).toEqual([{ lat: 1, lon: 2 }])
  })

  it('reads valid optional fields, including negative elevation', () => {
    const inner =
      '<ele> -3.5 </ele><time>2026-01-02T03:04:05Z</time>' +
      '<extensions><x><hr>0</hr><cad>88</cad></x></extensions>'
    expect(ok(gpx(trk(pt('1', '2', inner)))).points[0]).toEqual({
      lat: 1,
      lon: 2,
      ele: -3.5,
      time: Date.UTC(2026, 0, 2, 3, 4, 5),
      hr: 0,
      cad: 88,
    })
  })
})

describe('extensions and namespaces', () => {
  const TPX2 = 'http://www.garmin.com/xmlschemas/TrackPointExtension/v2'

  it('reads HR/cadence under any prefix or namespace', () => {
    const inner =
      `<extensions><gpxtpx:TrackPointExtension xmlns:gpxtpx="${TPX2}">` +
      '<gpxtpx:hr>140</gpxtpx:hr><gpxtpx:cad>90</gpxtpx:cad>' +
      '</gpxtpx:TrackPointExtension></extensions>'
    expect(ok(gpx(trk(pt('1', '2', inner)))).points[0]).toMatchObject({ hr: 140, cad: 90 })
  })

  it('reads heartrate/cadence element names', () => {
    const inner = '<extensions><heartrate>120</heartrate><cadence>80</cadence></extensions>'
    expect(ok(gpx(trk(pt('1', '2', inner)))).points[0]).toMatchObject({ hr: 120, cad: 80 })
  })

  it.each([
    ['GPX 1.0', 'http://www.topografix.com/GPX/1/0'],
    ['no namespace', ''],
  ])('parses %s', (_, ns) => {
    const track = ok(gpx(trk(pt('1', '2', '<ele>5</ele>')), ns))
    expect(track.points).toEqual([{ lat: 1, lon: 2, ele: 5 }])
  })
})
