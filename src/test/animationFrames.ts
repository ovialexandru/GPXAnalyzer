// Manual requestAnimationFrame for tests: callbacks run only when `flushFrame` is called.
import { act } from '@testing-library/react'
import { vi } from 'vitest'

let queue: FrameRequestCallback[] = []

/** Replace `requestAnimationFrame` with a queue; call in `beforeEach`. */
export function stubAnimationFrames() {
  queue = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => queue.push(cb))
  vi.stubGlobal('cancelAnimationFrame', () => {})
}

/** Frames waiting to run. */
export function pendingFrames(): number {
  return queue.length
}

/** Run the callbacks queued so far, inside `act` so React commits their updates. */
export function flushFrame() {
  const callbacks = queue
  queue = []
  act(() => callbacks.forEach((cb) => cb(performance.now())))
}
