# Plan – Phase 5: Map

Goal: track visible on a map (see `specs/roadmap.md`, Phase 5). API and behavior in `requirements.md`.

## 1. Dependencies and lint
1. `npm i leaflet` and `npm i -D @types/leaflet`.
2. In `eslint.config.js`, add `'leaflet'` to the restricted-import group for `model`/`parser`/`metrics`.

## 2. Geometry helpers (metrics)
1. Create `src/metrics/geometry.ts` with `LatLon`, `TrackBounds`, `getSegmentLines(track)` and `getTrackBounds(track)` (single pass; `null` for no points).
2. `getSegmentLines` slices `points` at each `segmentStarts` entry; skip empty segments.
3. Re-export from `src/metrics/index.ts`.
4. Add `src/metrics/geometry.test.ts`: `run.gpx` → 1 line of 150; `bike.gpx` → 2 lines whose lengths sum to 200 and split at `segmentStarts[1]`; bounds match min/max lat/lon of the fixture; single-point track → zero-size bounds; empty `points` → `null`.

## 3. Map hook and layers
1. Create `src/ui/map/useLeafletMap.ts`: given a container ref, create the map once in `useEffect` (`preferCanvas: true`), add the OSM tile layer with attribution, the scale control and the fit control; return the map via state/ref; cleanup calls `map.remove()` (StrictMode-safe).
2. Create `src/ui/map/FitControl.ts`: `L.Control` subclass rendering a `<button aria-label="Fit to track">` that calls a callback; stop click/dblclick propagation to the map (`L.DomEvent.disableClickPropagation`).
3. Create `src/ui/map/trackLayers.ts`: `createTrackLayers(track): L.LayerGroup` with one `L.polyline` per `getSegmentLines` entry, then start/end `L.circleMarker`s with tooltips ("Start"/"Finish" + `new Date(time).toLocaleString()` when present).
4. Keep style constants (colours, weight, radius, padding, fit `maxZoom`) in one place in `trackLayers.ts`.

## 4. TrackMap component
1. Create `src/ui/map/TrackMap.tsx` + `TrackMap.module.css` (`60vh`, `min-height: 320px`, rounded border matching the summary).
2. On `track` change: remove the previous `LayerGroup`, add the new one, `fitBounds` from `getTrackBounds` with padding and `maxZoom: 16`.
3. The fit control calls the same fit function with the current track's bounds (keep the latest bounds in a ref).
4. Import `leaflet/dist/leaflet.css` in `TrackMap.tsx`.
5. Add `src/ui/map/index.ts` re-exporting `TrackMap`.
6. In `App.tsx`, render `<TrackMap track={loaded.track} />` after `TrackSummary` when `loaded`.

## 5. Component tests (Vitest, mocked Leaflet)
Add `src/ui/map/TrackMap.test.tsx` with `vi.mock('leaflet')` returning spies for `map`, `tileLayer`, `polyline`, `circleMarker`, `layerGroup`, `control.scale`, `Control.extend`, `DomUtil`, `DomEvent`:
1. Render with `run.gpx` → map created with `preferCanvas: true`; tile layer URL and attribution; scale control added; 1 polyline; 2 circle markers; `fitBounds` called with the fixture bounds and `maxZoom: 16`.
2. `bike.gpx` → 2 polylines.
3. Rerender with another track → old layer group removed, new one added, `fitBounds` called again, `L.map` called only once.
4. Tooltips: "Start"/"Finish" with time for `run.gpx`; without time for `no-ele-time.gpx`.
5. Fit control callback → `fitBounds` called with the current track's bounds.
6. Unmount → `map.remove()` called.
7. Extend `src/ui/App.test.tsx`: after a good upload, a region named "Track map" is present; before any upload it is not.

## 6. Playwright
1. Add `e2e/map.spec.ts`: `page.route('https://tile.openstreetmap.org/**')` fulfilling a 1×1 PNG (base64 constant); fail the test on any other request to an external host.
2. Upload `run.gpx` → region "Track map" visible, `.leaflet-container` and a `canvas` inside it, OSM attribution text visible, "Fit to track" button visible.
3. Record the scale control's text, click "Zoom in" twice, check the scale text changed, click "Fit to track" → scale text equals the recorded value again.
4. Upload `bike.gpx` afterwards → still exactly one `.leaflet-container`.

## 7. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual desktop check with `npm run dev`, including the largest file in `GpxFiles/` (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 5 checkboxes in `specs/roadmap.md`.
