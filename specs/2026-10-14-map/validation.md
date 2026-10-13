# Validation – Phase 5: Map

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-map`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing parser, fixture and upload tests.
- [ ] `npm run test:e2e` passes in Chromium with no real requests to `tile.openstreetmap.org` (all stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – geometry helpers
- [ ] `getSegmentLines`: `run.gpx` → 1 line of 150 points; `bike.gpx` → 2 lines, split at `segmentStarts[1]`, 200 points total.
- [ ] `getTrackBounds`: matches the min/max lat/lon of each fixture.
- [ ] Single-point track → zero-size bounds; track with no points → `null`.

## Component tests – mocked Leaflet
- [ ] Map created once with `preferCanvas: true`, OSM tile URL, attribution, and a metric scale control.
- [ ] One polyline per segment (`run.gpx` 1, `bike.gpx` 2) and two circle markers.
- [ ] `fitBounds` called with the track's bounds and `maxZoom: 16`.
- [ ] Loading a second track swaps the layer group and re-fits without creating a new map.
- [ ] Start/end tooltips read "Start"/"Finish", with time when the point has one and without when it does not.
- [ ] The fit control re-fits to the current track.
- [ ] Unmount calls `map.remove()`.
- [ ] `App` shows the "Track map" region only after a successful upload.

## E2E – Playwright
- [ ] Uploading `run.gpx` shows the map with a canvas, the OSM attribution and the "Fit to track" button.
- [ ] After zooming in, "Fit to track" returns to the fitted view.
- [ ] Loading a second file keeps a single map instance.

## Manual – desktop browser (`npm run dev`)
- [ ] All three fixtures and all files in `GpxFiles/` display on the map, fitted to the track.
- [ ] `bike.gpx` shows a visible gap between its two segments (no straight connecting line).
- [ ] Start marker is green, end marker red; both show their tooltips on hover.
- [ ] Scale control is visible and updates when zooming.
- [ ] Loading a bad file after a good one leaves the map and track unchanged.
- [ ] **Large-track performance:** with the largest file in `GpxFiles/`, panning and zooming stay smooth (no visible lag) and loading does not freeze the page noticeably.

## Design
- [ ] `src/metrics/geometry.ts` is pure, imports only from `src/model`, and uses no Leaflet types; lint forbids `leaflet` in `model`/`parser`/`metrics`.
- [ ] Leaflet is used directly (no react-leaflet); one map instance per `TrackMap` mount.
- [ ] Markers are `circleMarker`s; no Leaflet marker image assets are bundled or requested.
- [ ] "Fit to track" is a real `<button>` with an accessible name and a tap target of at least 44 px.
- [ ] Styles use CSS modules; Leaflet's own CSS is the only added global stylesheet.
- [ ] The GPX file never leaves the browser; the only external requests are OSM tiles.
- [ ] Only new dependencies are `leaflet` and `@types/leaflet` (dev); no module over ~200 lines.

## Merge gate
- [ ] All Phase 5 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the Phase 5 checkboxes in `specs/roadmap.md`.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
