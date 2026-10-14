import { flushFrame, pendingFrames, stubAnimationFrames } from '../../test/animationFrames.ts'
import { createViewStore } from './viewStore.ts'

beforeEach(() => {
  stubAnimationFrames()
})

describe('createViewStore', () => {
  it('starts with no hover', () => {
    expect(createViewStore().getState()).toEqual({ hover: null })
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
