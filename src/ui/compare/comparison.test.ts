import type { Track } from '../../model/index.ts'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { axisModeFor, createComparison, getTrackEntries } from './comparison.ts'
import type { TrackEntry } from './trackIds.ts'

function pair(a: string, b: string): [TrackEntry, TrackEntry] {
  const [ea, eb] = getTrackEntries([
    { fileName: 'a.gpx', track: parseTrack(a) },
    { fileName: 'b.gpx', track: parseTrack(b) },
  ])
  return [ea, eb]
}

describe('getTrackEntries', () => {
  it('ids, names (or file names) and colors in order; at most two', () => {
    const unnamed: Track = { ...parseTrack(run), name: undefined }
    const entries = getTrackEntries([
      { fileName: 'run.gpx', track: parseTrack(run) },
      { fileName: 'unnamed.gpx', track: unnamed },
      { fileName: 'third.gpx', track: parseTrack(run) },
    ])
    expect(entries.map((e) => [e.id, e.name, e.color])).toEqual([
      ['a', 'Run fixture', '#1d4ed8'],
      ['b', 'unnamed.gpx', '#ea580c'],
    ])
    expect(entries[0].metrics.totals.distance).toBeGreaterThan(1000)
  })

  it('a track keeps its metrics object when it moves from B to A', () => {
    const a = { fileName: 'a.gpx', track: parseTrack(run) }
    const b = { fileName: 'b.gpx', track: parseTrack(runB) }
    const before = getTrackEntries([a, b])[1].metrics
    expect(getTrackEntries([b])[0].metrics).toBe(before)
  })
})

describe('axisModeFor', () => {
  it('time only when every track has timestamps', () => {
    expect(axisModeFor([parseTrack(run), parseTrack(runB)], 'time')).toBe('time')
    expect(axisModeFor([parseTrack(run), parseTrack(noEleTime)], 'time')).toBe('distance')
    expect(axisModeFor([parseTrack(run)], 'distance')).toBe('distance')
  })
})

describe('createComparison', () => {
  it('owner: the track reaching further on the axis', () => {
    expect(createComparison(pair(run, runB), 'distance', 'metric').owner).toBe('a')
    expect(createComparison(pair(runB, run), 'distance', 'metric').owner).toBe('b')
  })

  it('pointOn: the hovered point on its own track, the aligned point on the other', () => {
    const c = createComparison(pair(run, runB), 'distance', 'metric')
    expect(c.pointOn({ index: 40, source: 'map' }, 'a')).toBe(40)
    expect(c.pointOn({ index: 40, source: 'map', track: 'b' }, 'b')).toBe(40)
    expect(Math.abs(c.pointOn({ index: 40, source: 'speed' }, 'b')! - 40)).toBeLessThanOrEqual(1)
    // Past the end of B.
    expect(c.pointOn({ index: 145, source: 'speed' }, 'b')).toBeNull()
  })

  it('rangeOn: the range on its own track, aligned and cut on the other', () => {
    const c = createComparison(pair(run, runB), 'distance', 'metric')
    expect(c.rangeOn([10, 140], undefined, 'a')).toEqual([10, 140])
    const onB = c.rangeOn([10, 140], undefined, 'b')!
    expect(Math.abs(onB[0] - 10)).toBeLessThanOrEqual(1)
    expect(onB[1]).toBe(129)
    expect(c.rangeOn([135, 149], 'a', 'b')).toBeNull()
  })

  it('imperial units give the same alignment', () => {
    const metric = createComparison(pair(run, runB), 'distance', 'metric')
    const imperial = createComparison(pair(run, runB), 'distance', 'imperial')
    for (const index of [5, 50, 100]) {
      const hover = { index, source: 'map' as const }
      expect(imperial.pointOn(hover, 'b')).toBe(metric.pointOn(hover, 'b'))
    }
  })

  it('entry(id)', () => {
    const entries = pair(run, runB)
    const c = createComparison(entries, 'time', 'metric')
    expect(c.entry('a')).toBe(entries[0])
    expect(c.entry('b')).toBe(entries[1])
    expect(c.mode).toBe('time')
  })
})
