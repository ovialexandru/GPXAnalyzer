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

/** Fake projection: container pixels per degree (1 px ≈ 1.1 m). */
export const PX_PER_DEG = 100_000

/** Container point of a lat/lon under the fake projection (north is up). */
export function project(lat: number, lon: number) {
  return { x: lon * PX_PER_DEG, y: -lat * PX_PER_DEG }
}

/** A map mouse event at a container point, with its lat/lon. */
export function mouseEventAt(x: number, y: number) {
  return { containerPoint: { x, y }, latlng: { lat: -y / PX_PER_DEG, lng: x / PX_PER_DEG } }
}

type Handler = (event?: unknown) => void

function fakeMap() {
  const handlers = new Map<string, Set<Handler>>()
  const map = {
    fitBounds: vi.fn(),
    remove: vi.fn(),
    on: vi.fn((event: string, handler: Handler) => {
      if (!handlers.has(event)) handlers.set(event, new Set())
      handlers.get(event)!.add(handler)
      return map
    }),
    off: vi.fn((event: string, handler?: Handler) => {
      if (handler) handlers.get(event)?.delete(handler)
      else handlers.delete(event)
      return map
    }),
    once: vi.fn().mockReturnThis(),
    latLngToContainerPoint: vi.fn(([lat, lon]: [number, number]) => project(lat, lon)),
    /** Call the handlers registered with `on`, like Leaflet would. */
    emit: (event: string, e?: unknown) => handlers.get(event)?.forEach((h) => h(e)),
    handlers,
  }
  return map
}

export type FakeMap = ReturnType<typeof fakeMap>

const L = {
  map: vi.fn(fakeMap),
  marker: vi.fn((latlng: unknown, options: unknown) => {
    const marker = {
      latlng,
      options,
      addTo: vi.fn(() => marker),
      remove: vi.fn(() => marker),
      setLatLng: vi.fn((next: unknown) => {
        marker.latlng = next
        return marker
      }),
    }
    return marker
  }),
  divIcon: vi.fn((options: unknown) => ({ options })),
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
