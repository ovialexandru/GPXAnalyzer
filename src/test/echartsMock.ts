// Fake ECharts core for jsdom (no canvas or layout). Use with:
//   vi.mock('echarts/core', () => import('<path>/test/echartsMock.ts'))
// Also installs a ResizeObserver stub, which jsdom lacks.
import { vi } from 'vitest'

type Handler = (event?: unknown) => void

export interface FakeChart {
  node: HTMLElement
  setOption: ReturnType<typeof vi.fn>
  resize: ReturnType<typeof vi.fn>
  dispose: ReturnType<typeof vi.fn>
  isDisposed: () => boolean
  on: ReturnType<typeof vi.fn>
  off: ReturnType<typeof vi.fn>
  dispatchAction: ReturnType<typeof vi.fn>
  /** Fake layout: x axis value * 100 px. */
  convertToPixel: ReturnType<typeof vi.fn>
  getHeight: () => number
  getDom: () => HTMLElement
  /** Call the handlers registered with `on` for an event, like ECharts would. */
  emit: (event: string, params?: unknown) => void
  /** Handlers currently registered, by event name. */
  handlers: Map<string, Set<Handler>>
}

/** Pixel x the fake chart reports for an x axis value. */
export const PX_PER_X = 100
export const FAKE_CHART_HEIGHT = 220

/** Charts created by `init`, in order. */
export const charts: FakeChart[] = []

export const use = vi.fn()

export const init = vi.fn((node: HTMLElement): FakeChart => {
  const handlers = new Map<string, Set<Handler>>()
  const chart: FakeChart = {
    node,
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    isDisposed: () => chart.dispose.mock.calls.length > 0,
    on: vi.fn((event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
    }),
    off: vi.fn((event: string, handler?: Handler) => {
      if (handler) handlers.get(event)?.delete(handler)
      else handlers.delete(event)
    }),
    dispatchAction: vi.fn(),
    convertToPixel: vi.fn((_finder: unknown, x: number) => x * PX_PER_X),
    getHeight: () => FAKE_CHART_HEIGHT,
    getDom: () => node,
    emit: (event, params) => handlers.get(event)?.forEach((h) => h(params)),
    handlers,
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
