import bike from '../test/fixtures/bike.gpx?raw'
import { parseTrack } from '../test/tracks.ts'
import { clipSegmentRanges, getSegmentRanges } from './index.ts'

describe('clipSegmentRanges', () => {
  const track = parseTrack(bike) // 200 points, second segment starts at 100

  it('without a range: every segment', () => {
    expect(clipSegmentRanges(track)).toEqual(getSegmentRanges(track))
    expect(clipSegmentRanges(track)).toEqual([
      [0, 100],
      [100, 200],
    ])
  })

  it('a range inside one segment', () => {
    expect(clipSegmentRanges(track, [10, 20])).toEqual([[10, 21]])
  })

  it("a range spanning bike.gpx's segment boundary at 100", () => {
    expect(clipSegmentRanges(track, [50, 149])).toEqual([
      [50, 100],
      [100, 150],
    ])
  })

  it('a range ending exactly on a segment start', () => {
    expect(clipSegmentRanges(track, [90, 100])).toEqual([
      [90, 100],
      [100, 101],
    ])
  })

  it('the whole track as a range', () => {
    expect(clipSegmentRanges(track, [0, 199])).toEqual(getSegmentRanges(track))
  })
})
