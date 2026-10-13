import bike from '../../test/fixtures/bike.gpx?raw'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseGpx } from '../../parser/index.ts'
import { loadGpxFile, MAX_FILE_BYTES, type LoadedTrack, type UploadErrorCode } from './index.ts'

function file(content: string, name: string): File {
  return new File([content], name, { type: 'application/gpx+xml' })
}

async function ok(f: File): Promise<LoadedTrack> {
  const result = await loadGpxFile(f)
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`)
  return result.loaded
}

async function expectError(f: File, code: UploadErrorCode, message?: string) {
  const result = await loadGpxFile(f)
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error.code).toBe(code)
  if (message !== undefined) expect(result.error.message).toBe(message)
  else expect(result.error.message.trim()).not.toBe('')
}

describe('loadGpxFile', () => {
  it.each([
    { name: 'run.gpx', text: run, points: 150 },
    { name: 'bike.gpx', text: bike, points: 200 },
    { name: 'no-ele-time.gpx', text: noEleTime, points: 80 },
  ])('loads $name with $points points', async ({ name, text, points }) => {
    const loaded = await ok(file(text, name))
    expect(loaded.fileName).toBe(name)
    expect(loaded.track.points).toHaveLength(points)
  })

  it('accepts an uppercase .GPX extension', async () => {
    expect((await ok(file(run, 'RUN.GPX'))).fileName).toBe('RUN.GPX')
  })

  it.each(['run.txt', 'run.gpx.xml', 'run', 'gpx'])(
    'rejects %s without reading it',
    async (name) => {
      const f = file(run, name)
      const text = vi.spyOn(f, 'text')
      await expectError(f, 'wrong-extension', 'Please choose a .gpx file.')
      expect(text).not.toHaveBeenCalled()
    },
  )

  it('rejects an empty file', async () => {
    await expectError(file('', 'empty.gpx'), 'empty-file', 'This file is empty.')
  })

  it('rejects a file over 50 MB without reading it', async () => {
    const f = file(run, 'huge.gpx')
    Object.defineProperty(f, 'size', { value: MAX_FILE_BYTES + 1 })
    const text = vi.spyOn(f, 'text')
    await expectError(f, 'too-large', 'This file is larger than 50 MB.')
    expect(text).not.toHaveBeenCalled()
  })

  it('accepts a file of exactly 50 MB', async () => {
    const f = file(run, 'max.gpx')
    Object.defineProperty(f, 'size', { value: MAX_FILE_BYTES })
    await ok(f)
  })

  it('reports read-failed when text() rejects', async () => {
    const f = file(run, 'run.gpx')
    vi.spyOn(f, 'text').mockRejectedValue(new DOMException('NotReadableError'))
    await expectError(f, 'read-failed', 'The file could not be read.')
  })

  it.each([
    { text: '<gpx', code: 'invalid-xml' },
    { text: '<?xml version="1.0"?><kml/>', code: 'not-gpx' },
    { text: '<?xml version="1.0"?><gpx version="1.1"/>', code: 'no-points' },
  ] as const)('passes the parser $code error through', async ({ text, code }) => {
    const parsed = parseGpx(text)
    if (parsed.ok) throw new Error('expected a parser error')
    await expectError(file(text, 'bad.gpx'), code, parsed.error.message)
  })
})
