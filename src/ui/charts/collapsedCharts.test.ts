import { loadCollapsed, saveCollapsed } from './collapsedCharts.ts'

describe('collapsed charts storage', () => {
  afterEach(() => vi.restoreAllMocks())

  it('none by default; round trip', () => {
    expect(loadCollapsed()).toEqual(new Set())
    saveCollapsed(new Set(['speed', 'cadence']))
    expect(loadCollapsed()).toEqual(new Set(['speed', 'cadence']))
  })

  it('ignores invalid stored values', () => {
    localStorage.setItem('gpx-analyzer.collapsedCharts', '{"x":1}')
    expect(loadCollapsed()).toEqual(new Set())
    localStorage.setItem('gpx-analyzer.collapsedCharts', '["speed","map"]')
    expect(loadCollapsed()).toEqual(new Set(['speed']))
    localStorage.setItem('gpx-analyzer.collapsedCharts', 'not json')
    expect(loadCollapsed()).toEqual(new Set())
  })

  it('blocked storage: nothing collapsed, saving does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadCollapsed()).toEqual(new Set())
    expect(() => saveCollapsed(new Set(['speed']))).not.toThrow()
  })
})
