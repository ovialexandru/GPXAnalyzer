import { flushFrame, pendingFrames, stubAnimationFrames } from '../../test/animationFrames.ts'
import { createViewStore } from './viewStore.ts'

beforeEach(() => {
  stubAnimationFrames()
})

describe('createViewStore', () => {
  it('starts with no hover, zoom or selection', () => {
    expect(createViewStore().getState()).toEqual({ hover: null, zoom: null, selection: null })
  })

  it('stores the value right away and notifies once per frame with the last value', () => {
    const store = createViewStore()
    const seen: unknown[] = []
    store.subscribe(() => seen.push(store.getState().hover))

    store.setHover({ index: 1, source: 'map' })
    expect(store.getState().hover).toEqual({ index: 1, source: 'map' })
    store.setHover({ index: 2, source: 'map' })
    store.setHover({ index: 3, source: 'elevation' })
    expect(pendingFrames()).toBe(1)
    expect(seen).toEqual([])

    flushFrame()
    expect(seen).toEqual([{ index: 3, source: 'elevation' }])
  })

  it('the same value again schedules nothing', () => {
    const store = createViewStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.setHover({ index: 5, source: 'speed' })
    flushFrame()

    store.setHover({ index: 5, source: 'speed' })
    expect(pendingFrames()).toBe(0)
    store.setHover(null)
    flushFrame()
    store.setHover(null)
    expect(pendingFrames()).toBe(0)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('setHover(null) clears the hover', () => {
    const store = createViewStore()
    store.setHover({ index: 5, source: 'map' })
    store.setHover(null)
    expect(store.getState().hover).toBeNull()
  })

  it('a new frame is scheduled after the previous one ran', () => {
    const store = createViewStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.setHover({ index: 1, source: 'map' })
    flushFrame()
    store.setHover({ index: 2, source: 'map' })
    expect(pendingFrames()).toBe(1)
    flushFrame()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('unsubscribe stops notifications', () => {
    const store = createViewStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    unsubscribe()
    store.setHover({ index: 1, source: 'map' })
    flushFrame()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('setZoom', () => {
  it('stores the range right away and notifies once per frame with the last value', () => {
    const store = createViewStore(100)
    const seen: unknown[] = []
    store.subscribe(() => seen.push(store.getState().zoom))

    store.setZoom([10, 20])
    expect(store.getState().zoom).toEqual([10, 20])
    store.setZoom([12, 30])
    expect(pendingFrames()).toBe(1)
    expect(seen).toEqual([])

    flushFrame()
    expect(seen).toEqual([[12, 30]])
  })

  it('the same range again schedules nothing and keeps the stored array', () => {
    const store = createViewStore(100)
    store.setZoom([10, 20])
    flushFrame()
    const stored = store.getState().zoom

    store.setZoom([10, 20])
    expect(pendingFrames()).toBe(0)
    expect(store.getState().zoom).toBe(stored)
  })

  it('a range covering the whole track is stored as null', () => {
    const store = createViewStore(100)
    store.setZoom([10, 20])
    store.setZoom([0, 99])
    expect(store.getState().zoom).toBeNull()
    store.setZoom([0, 98])
    expect(store.getState().zoom).toEqual([0, 98])
  })

  it('without a point count no range is normalised', () => {
    const store = createViewStore()
    store.setZoom([0, 99])
    expect(store.getState().zoom).toEqual([0, 99])
  })

  it('hover and zoom are independent slices', () => {
    const store = createViewStore(100)
    store.setHover({ index: 5, source: 'map' })
    const hover = store.getState().hover
    store.setZoom([10, 20])
    expect(store.getState().hover).toBe(hover)
    const zoom = store.getState().zoom
    store.setHover({ index: 6, source: 'map' })
    expect(store.getState().zoom).toBe(zoom)
    // One frame for both changes.
    expect(pendingFrames()).toBe(1)
  })
})

describe('setSelection', () => {
  it('stores the range right away and notifies once per frame with the last value', () => {
    const store = createViewStore(100)
    const seen: unknown[] = []
    store.subscribe(() => seen.push(store.getState().selection))

    store.setSelection([10, 20])
    expect(store.getState().selection).toEqual([10, 20])
    store.setSelection([10, 25])
    store.setSelection([10, 30])
    expect(pendingFrames()).toBe(1)
    expect(seen).toEqual([])

    flushFrame()
    expect(seen).toEqual([[10, 30]])
  })

  it('a range of fewer than 2 points is stored as null', () => {
    const store = createViewStore(100)
    store.setSelection([10, 20])
    store.setSelection([15, 15])
    expect(store.getState().selection).toBeNull()
    store.setSelection([15, 16])
    expect(store.getState().selection).toEqual([15, 16])
  })

  it('the same range again schedules nothing and keeps the stored array', () => {
    const store = createViewStore(100)
    store.setSelection([10, 20])
    flushFrame()
    const stored = store.getState().selection

    store.setSelection([10, 20])
    expect(pendingFrames()).toBe(0)
    expect(store.getState().selection).toBe(stored)
    store.setSelection(null)
    flushFrame()
    store.setSelection([3, 3])
    expect(pendingFrames()).toBe(0)
  })

  it('the whole track stays selected (unlike zoom)', () => {
    const store = createViewStore(100)
    store.setSelection([0, 99])
    expect(store.getState().selection).toEqual([0, 99])
  })

  it('selection, hover and zoom are independent slices', () => {
    const store = createViewStore(100)
    store.setHover({ index: 5, source: 'map' })
    store.setZoom([10, 20])
    const { hover, zoom } = store.getState()
    store.setSelection([12, 18])
    expect(store.getState().hover).toBe(hover)
    expect(store.getState().zoom).toBe(zoom)
    const selection = store.getState().selection
    store.setHover({ index: 6, source: 'map' })
    store.setZoom([0, 50])
    expect(store.getState().selection).toBe(selection)
    expect(pendingFrames()).toBe(1)
  })
})
