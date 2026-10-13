import bike from './fixtures/bike.gpx?raw'
import noEleTime from './fixtures/no-ele-time.gpx?raw'
import run from './fixtures/run.gpx?raw'

const TPX = 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1'

function parse(xml: string): Document {
  return new DOMParser().parseFromString(xml, 'application/xml')
}

// Counts must match src/test/fixtures/README.md
describe.each([
  { name: 'run.gpx', xml: run, trkpt: 150, trkseg: 1 },
  { name: 'bike.gpx', xml: bike, trkpt: 200, trkseg: 2 },
  { name: 'no-ele-time.gpx', xml: noEleTime, trkpt: 80, trkseg: 1 },
])('$name', ({ xml, trkpt, trkseg }) => {
  const doc = parse(xml)

  it('is well-formed XML', () => {
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0)
  })

  it('has the documented trkpt and trkseg counts', () => {
    expect(doc.getElementsByTagName('trkpt')).toHaveLength(trkpt)
    expect(doc.getElementsByTagName('trkseg')).toHaveLength(trkseg)
  })

  it('has no personal metadata', () => {
    expect(doc.getElementsByTagName('metadata')).toHaveLength(0)
  })
})

it('no-ele-time.gpx has no ele or time elements', () => {
  const doc = parse(noEleTime)
  expect(doc.getElementsByTagName('ele')).toHaveLength(0)
  expect(doc.getElementsByTagName('time')).toHaveLength(0)
})

it('run.gpx has HR and cadence extensions on every point', () => {
  const doc = parse(run)
  expect(doc.getElementsByTagNameNS(TPX, 'hr')).toHaveLength(150)
  expect(doc.getElementsByTagNameNS(TPX, 'cad')).toHaveLength(150)
})
