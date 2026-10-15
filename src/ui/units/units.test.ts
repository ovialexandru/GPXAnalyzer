import { distanceUnitMeters, loadUnits, saveUnits } from './units.ts'

describe('units storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('defaults to metric', () => {
    expect(loadUnits()).toBe('metric')
  })

  it('remembers the choice', () => {
    saveUnits('imperial')
    expect(loadUnits()).toBe('imperial')
    saveUnits('metric')
    expect(loadUnits()).toBe('metric')
  })

  it('an unknown stored value reads as metric', () => {
    localStorage.setItem('gpx-analyzer.units', 'nautical')
    expect(loadUnits()).toBe('metric')
  })

  it('blocked storage: metric, and saving does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadUnits()).toBe('metric')
    expect(() => saveUnits('imperial')).not.toThrow()
  })
})

describe('distanceUnitMeters', () => {
  it('km or mile', () => {
    expect(distanceUnitMeters('metric')).toBe(1000)
    expect(distanceUnitMeters('imperial')).toBe(1609.344)
  })
})
