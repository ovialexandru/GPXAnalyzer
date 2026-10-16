import { loadTrackColor, saveTrackColor } from './trackColor.ts'

describe('track color storage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('defaults to plain', () => {
    expect(loadTrackColor()).toBe('plain')
  })

  it('remembers the choice', () => {
    saveTrackColor('speed')
    expect(loadTrackColor()).toBe('speed')
    expect(localStorage.getItem('gpx-analyzer.trackColor')).toBe('speed')
    saveTrackColor('plain')
    expect(loadTrackColor()).toBe('plain')
  })

  it('an unknown stored value reads as plain', () => {
    localStorage.setItem('gpx-analyzer.trackColor', 'rainbow')
    expect(loadTrackColor()).toBe('plain')
  })

  it('blocked storage: plain, and saving does not throw', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(loadTrackColor()).toBe('plain')
    expect(() => saveTrackColor('speed')).not.toThrow()
  })
})
