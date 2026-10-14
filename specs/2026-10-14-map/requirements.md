# Requirements – Phase 5: Map

## Scope
From `specs/roadmap.md` Phase 5:
- Leaflet map with OSM tiles.
- Polyline drawn, map fits bounds.
- Start/end markers.

Also included (decided with the user):
- Scale control (metric only; the metric/imperial toggle is Phase 15).
- A "Fit to track" control that re-fits the bounds after the user pans or zooms away.
- Canvas renderer (`preferCanvas: true`) so large tracks stay smooth.
- Tooltips on the start/end markers: "Start" / "Finish", plus the local time when the point has one.

## Out of scope
- Hover marker and cursor linking with charts (Phase 10); selected-segment highlight (Phase 12).
- Shared state via context/Zustand (Phase 10).
- Responsive/mobile layout work, phone-viewport E2E, metric/imperial toggle (Phase 15).
- Other tile providers, layer switcher, satellite imagery, offline tiles.
- Downsampling the polyline ourselves; Leaflet's built-in `smoothFactor` simplification is enough for now.
- Tracks crossing the antimeridian.

## API
```ts
// src/metrics/geometry.ts, re-exported from src/metrics/index.ts
/** [lat, lon] in degrees; plain tuples so metrics stays free of Leaflet types. */
type LatLon = [number, number]

interface TrackBounds {
  south: number
  west: number
  north: number
  east: number
}

/** One coordinate list per segment, split at `track.segmentStarts`. */
function getSegmentLines(track: Track): LatLon[][]

/** Bounding box of all points; null for a track with no points. */
function getTrackBounds(track: Track): TrackBounds | null

// src/ui/map/TrackMap.tsx
function TrackMap(props: { track: Track }): JSX.Element
```

## Behavior
| Situation | Result |
|---|---|
| Track loaded (first time) | Map appears below the summary with OSM tiles, one line per segment, start/end markers, fitted to the track |
| Track has several segments | Each segment is its own line; no straight line joins the gap between segments |
| Another track loaded | Same map instance; old track layers removed, new ones added, bounds re-fitted |
| Bad file while a track is shown | Map and track stay as they are (follows Phase 4: replace only on success) |
| Track with a single point | Start and end markers on the same spot; map centered there at the max fit zoom |
| User pans/zooms, then clicks "Fit to track" | Map returns to the track's bounds |
| Hover/tap on start marker | Tooltip "Start" (and the point's local time if present) |
| Hover/tap on end marker | Tooltip "Finish" (and the point's local time if present) |
| Component unmounts | `map.remove()` called; no leaked listeners (also safe under React StrictMode double mount) |

## UI
- `TrackMap`: a `<div>` container, full column width, height `60vh` with `min-height: 320px`; rendered only when a track is loaded, below `TrackSummary`.
- The container has `role="region"` and `aria-label="Track map"`.
- Tile layer: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, `maxZoom: 19`, attribution `&copy; OpenStreetMap contributors` linking to `https://www.openstreetmap.org/copyright`.
- Track line: one colour (blue, `#1d4ed8`), weight 4.
- Markers: `L.circleMarker`, radius 7, white border; start green (`#16a34a`), end red (`#dc2626`); drawn above the line.
- `fitBounds` with padding (about 24 px) and `maxZoom: 16` so single-point and very short tracks are not zoomed to street-level maximum.
- Controls: zoom (default), scale (`metric: true, imperial: false`), "Fit to track" button as a custom `L.Control` with a real `<button>`, `aria-label="Fit to track"`, tap target at least 44 px.
- Leaflet's CSS imported once (`leaflet/dist/leaflet.css`) by the map module.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Leaflet integration | Plain `leaflet` + small hooks, no react-leaflet | Full control over layer updates, needed for the hover marker (Phase 10) and selection highlight (Phase 12) on large tracks; one dependency fewer |
| Segments | One polyline per segment from `segmentStarts` | Gaps (paused GPS) are not drawn as fake straight lines |
| Markers | `circleMarker` green/red | No image assets, so no Vite icon-path workaround; renders on canvas |
| Geometry helpers | `src/metrics/geometry.ts`, plain tuples/objects | Track → derived data is the metrics layer's job; pure and unit-tested without Leaflet |
| Map lifecycle | One map instance; swap a `LayerGroup` when the track changes | No tile reload flicker or re-init cost when loading another file |
| Placement | Below the summary, only when a track is loaded, fixed `60vh` / min 320 px | Simple for now; full layout comes in Phase 15 |
| Renderer | `preferCanvas: true` | Tens of thousands of points stay interactive (mission principle 4) |
| Fit control | Custom `L.Control` with a `<button>` | Lives inside the map like the zoom control; accessible and keyboard-usable |
| Time in tooltips | Formatted in the UI with `toLocaleString()` | SI/epoch in the model; formatting only in the UI (techstack conventions) |
| Unit tests | `vi.mock('leaflet')` and assert calls | jsdom has no layout or canvas; real rendering is covered by Playwright |
| E2E tiles | `page.route` OSM tiles to a stub PNG | Tests are offline, fast, deterministic and respect the OSM tile usage policy |
| Lint | Add `leaflet` to the restricted imports for `model`/`parser`/`metrics` | Keeps the map library in the UI layer |
| Location | `src/ui/map/` | Organised by feature, like `src/ui/upload/` |
| Branch / directory | `2026-10-14-map` | Spec naming convention `yyyy-mm-dd-feature-name` |

## Privacy note
The GPX file still never leaves the browser. Map tiles, however, are fetched from `tile.openstreetmap.org`, so the tile server sees which area is being viewed. This is expected for an OSM map and is consistent with the techstack choice; no track data is sent.

## Context
- `specs/mission.md`: private by default, no backend, linked views later, fast on large tracks, mobile-friendly with tap-sized controls, small steps.
- `specs/techstack.md`: Leaflet with OSM raster tiles (no API key); layers `parser` → `metrics` → `ui`; map refers to points by index; components under ~200 lines.
- Phase 3 `Track` has `points` (lat, lon, ele?, time?, hr?, cad?) and `segmentStarts` (first entry 0).
- Phase 4 `useGpxUpload` gives `loaded: { fileName, track } | null`; `App` renders `TrackSummary` when loaded. CSS modules are the styling convention.
- Fixtures: `run.gpx` (150 points, 1 segment), `bike.gpx` (200 points, 2 segments split at a real 700 m gap), `no-ele-time.gpx` (80 points, no time). Real recordings in `GpxFiles/` (bike, kayak, run) are git-ignored and used for manual checks.
- `src/main.tsx` renders in `StrictMode`, so effects run twice on mount in dev.
