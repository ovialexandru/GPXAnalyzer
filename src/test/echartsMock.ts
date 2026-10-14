// Fake ECharts core for jsdom (no canvas or layout). Use with:
//   vi.mock('echarts/core', () => import('<path>/test/echartsMock.ts'))
// Also installs a ResizeObserver stub, which jsdom lacks.
import { vi } from 'vitest'

export interface FakeChart {
  node: HTMLElement
  setOption: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
}

/** Charts created by `init`, in order. */
export const charts: FakeChart[] = []

export const use = vi.fn()

export const init = vi.fn((node: HTMLElement): FakeChart => {
  const chart = {
    node,
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }
  charts.push(chart)
  return chart
})

export class FakeResizeObserver {
  /** Observers created so far, in order. */
  static instances: FakeResizeObserver[] = []
  callback: ResizeObserverCallback
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
    FakeResizeObserver.instances.push(this)
  }

  /** Simulate a size change. */
  trigger() {
    this.callback([], this as unknown as ResizeObserver)
  }
}

vi.stubGlobal('ResizeObserver', FakeResizeObserver)

/** Charts that have not been disposed. */
export function liveCharts(): FakeChart[] {
  return charts.filter((c) => c.dispose.mock.calls.length === 0)
}

/** The last option passed to `chart.setOption`. */
export function lastOption(chart: FakeChart) {
  return chart.setOption.mock.lastCall?.[0]
}

export function resetEChartsMock() {
  vi.clearAllMocks()
  charts.length = 0
  FakeResizeObserver.instances.length = 0
}
