import { fireEvent, screen, within } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import type { Track } from '../../model/index.ts'
import { flushFrame, stubAnimationFrames } from '../../test/animationFrames.ts'
import { lastOption, liveCharts, resetEChartsMock, type FakeChart } from '../../test/echartsMock.ts'
import noEleTime from '../../test/fixtures/no-ele-time.gpx?raw'
import runB from '../../test/fixtures/run-b.gpx?raw'
import run from '../../test/fixtures/run.gpx?raw'
import { parseTrack } from '../../test/tracks.ts'
import { renderWithViewStore } from '../../test/viewStore.tsx'
import { ComparisonProvider } from '../compare/ComparisonContext.tsx'
import { getTrackEntries } from '../compare/comparison.ts'
import { UnitsProvider } from '../units/index.ts'
import { COMPARE_TIME_HINT } from './ChartsPanel.tsx'
import { ChartsPanel } from './index.ts'
import type { XAxisMode } from './xAxis.ts'

vi.mock('echarts/core', () => import('../../test/echartsMock.ts'))

/* eslint-disable @typescript-eslint/no-explicit-any -- reading back loosely typed option objects */

/** The panel for A and B in a comparison, keeping the x-axis choice like the app does. */
function Compared({ a, b }: { a: Track; b: Track }) {
  const [chosen, setChosen] = useState<XAxisMode>('distance')
  const entries = getTrackEntries([
    { fileName: 'a.gpx', track: a },
    { fileName: 'b.gpx', track: b },
  ])
  return (
    <UnitsProvider>
      <ComparisonProvider entries={entries} chosenMode={chosen}>
        <ChartsPanel
          track={entries[0].track}
          metrics={entries[0].metrics}
          chosenMode={chosen}
          onChosenModeChange={setChosen}
        />
      </ComparisonProvider>
    </UnitsProvider>
  )
}

let a: Track
let b: Track

function renderPair(first: Track, second: Track): ReturnType<typeof renderWithViewStore> {
  const ui: ReactElement = <Compared a={first} b={second} />
  return renderWithViewStore(ui)
}

function chartIn(name: string): FakeChart {
  const region = screen.getByRole('region', { name })
  const chart = liveCharts().find((c) => region.contains(c.node))
  if (!chart) throw new Error(`no chart in ${name}`)
  return chart
}

function seriesNames(name: string): string[] {
  return lastOption(chartIn(name)).series.map((s: any) => s.name)
}

function xAxisRadio(name: 'Distance' | 'Time') {
  return within(screen.getByRole('group', { name: 'X axis' })).getByRole('radio', { name })
}

function pointerAt(chart: FakeChart, x: number) {
  chart.emit('updateAxisPointer', { axesInfo: [{ axisDim: 'x', axisIndex: 0, value: x }] })
}

/** The x (px) the chart's last updateAxisPointer action put its pointer at; undefined when hidden. */
function pointerX(chart: FakeChart): number | undefined {
  const calls = chart.dispatchAction.mock.calls.filter((c) => c[0].type === 'updateAxisPointer')
  return calls.at(-1)?.[0].x
}

beforeEach(() => {
  resetEChartsMock()
  stubAnimationFrames()
  a = parseTrack(run)
  b = parseTrack(runB)
})

describe('ChartsPanel: two tracks', () => {
  it('every chart overlays the tracks that have its data, with a legend', () => {
    renderPair(a, b)
    const both = ['A · Run fixture', 'B · Run B fixture']
    expect(seriesNames('Speed chart')).toEqual(both)
    expect(seriesNames('Elevation chart')).toEqual(both)
    expect(seriesNames('Heart rate chart')).toEqual(both)
    // B has no cadence: the chart shows because A has it.
    expect(seriesNames('Cadence chart')).toEqual(['A · Run fixture'])
    expect(lastOption(chartIn('Speed chart')).legend.data).toEqual(both)
  })

  it('the x-axis covers the longer track', () => {
    renderPair(b, a)
    const max = lastOption(chartIn('Speed chart')).xAxis.max
    expect(max).toBeCloseTo(1.47, 2)
  })

  it('the time axis needs timestamps in both tracks', () => {
    renderPair(a, parseTrack(noEleTime))
    expect(xAxisRadio('Time')).toBeDisabled()
    expect(xAxisRadio('Time').closest('label')).toHaveAttribute('title', COMPARE_TIME_HINT)
    // Speed and elevation still show the track that has them.
    expect(seriesNames('Speed chart')).toEqual(['A · Run fixture'])
    expect(seriesNames('Elevation chart')).toEqual(['A · Run fixture'])
  })

  it('both timed: the time axis applies to every chart', () => {
    renderPair(a, b)
    fireEvent.click(xAxisRadio('Time'))
    expect(xAxisRadio('Time')).toBeChecked()
    for (const chart of liveCharts()) expect(lastOption(chart).xAxis.interval).toBeGreaterThan(0)
  })

  it('a chart hover is stored on the track reaching further; the other charts follow', () => {
    const { store } = renderPair(b, a) // A is the shorter run-b: B owns.
    pointerAt(chartIn('Speed chart'), 1.4)
    expect(store.getState().hover).toMatchObject({ source: 'speed', track: 'b' })
    flushFrame()
    expect(pointerX(chartIn('Elevation chart'))).toBeCloseTo(140, -1)
  })

  it('a hover on either track is placed at its own distance', () => {
    const { store } = renderPair(a, b)
    store.setHover({ index: 100, source: 'map', track: 'b' })
    flushFrame()
    const bIndexKm = getTrackEntries([{ fileName: 'b', track: b }])[0].metrics.distance[100] / 1000
    expect(pointerX(chartIn('Speed chart'))).toBeCloseTo(bIndexKm * 100, 6)
  })

  it('a brush is stored on the owner track, past the end of the shorter one', () => {
    const { store } = renderPair(b, a)
    const speed = chartIn('Speed chart')
    speed.emit('brush', { type: 'brush', areas: [{ coordRange: [1.2, 1.45] }] })
    expect(store.getState().selectionTrack).toBe('b')
    const [first, last] = store.getState().selection!
    expect(last).toBeGreaterThan(129)
    expect(first).toBeLessThan(last)
  })

  it('a selection stored on B is drawn on every chart at B’s distances', () => {
    const { store } = renderPair(a, b)
    store.setSelection([20, 60], 'b')
    flushFrame()
    const entryB = getTrackEntries([{ fileName: 'b', track: b }])[0]
    const brush = chartIn('Elevation chart')
      .dispatchAction.mock.calls.map((c) => c[0])
      .filter((p) => p.type === 'brush')
      .at(-1)
    expect(brush.areas[0].coordRange[0]).toBeCloseTo(entryB.metrics.distance[20] / 1000, 6)
    expect(brush.areas[0].coordRange[1]).toBeCloseTo(entryB.metrics.distance[60] / 1000, 6)
  })

  it('a zoom made on a chart is stored on the owner; Zoom to selection keeps the track', () => {
    const { store } = renderPair(b, a)
    chartIn('Speed chart').emit('datazoom', { type: 'datazoom', start: 10, end: 50 })
    expect(store.getState().zoomTrack).toBe('b')
    store.setSelection([10, 40], 'a')
    flushFrame()
    fireEvent.click(screen.getByRole('button', { name: 'Zoom to selection' }))
    expect(store.getState().zoom).toEqual([10, 40])
    expect(store.getState().zoomTrack).toBeUndefined()
  })

  it('a hover outside the zoom window (by distance on the other track) hides the pointer', () => {
    const { store } = renderPair(a, b)
    store.setZoom([0, 30])
    store.setHover({ index: 100, source: 'map', track: 'b' })
    flushFrame()
    expect(pointerX(chartIn('Speed chart'))).toBeUndefined()
    store.setHover({ index: 10, source: 'map', track: 'b' })
    flushFrame()
    expect(pointerX(chartIn('Speed chart'))).toBeGreaterThan(0)
  })
})
