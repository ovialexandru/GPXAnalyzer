// Fake Leaflet for jsdom (no layout or canvas). Use with:
//   vi.mock('leaflet', () => import('<path>/test/leafletMock.ts'))
// Calls are asserted through the mocked default export (`vi.mocked(L.map)` etc.).
import { vi } from 'vitest'

export interface FakeControl {
  options: unknown
  /** Element returned by the control's `onAdd`. */
  container: HTMLElement
}

/** Custom controls (from `Control.extend`) added to a map, in order. */
export const addedControls: FakeControl[] = []

export function resetLeafletMock() {
  vi.clearAllMocks()
  addedControls.length = 0
}

function chainable() {
  return { addTo: vi.fn().mockReturnThis(), remove: vi.fn() }
}

const L = {
  map: vi.fn(() => ({
    fitBounds: vi.fn(),
    remove: vi.fn(),
    on: vi.fn().mockReturnThis(),
    once: vi.fn().mockReturnThis(),
  })),
  tileLayer: vi.fn(() => chainable()),
  control: { scale: vi.fn(() => chainable()) },
  polyline: vi.fn((latlngs: unknown, options: unknown) => ({ latlngs, options })),
  circleMarker: vi.fn((latlng: unknown, options: unknown) => {
    const marker = {
      latlng,
      options,
      tooltip: undefined as string | undefined,
      bindTooltip: vi.fn((text: string) => {
        marker.tooltip = text
        return marker
      }),
    }
    return marker
  }),
  layerGroup: vi.fn((layers: unknown[]) => ({ layers, ...chainable() })),
  Control: {
    extend: vi.fn(
      (props: { onAdd: () => HTMLElement }) =>
        class {
          options: unknown
          constructor(options: unknown) {
            this.options = options
          }
          addTo() {
            addedControls.push({ options: this.options, container: props.onAdd() })
            return this
          }
        },
    ),
  },
  DomEvent: { disableClickPropagation: vi.fn() },
}

export default L
