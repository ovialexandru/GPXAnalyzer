# Validation – Phase 7: Elevation chart

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-metrics-and-charts` at the Phase 7 commit.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–6.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – option builder
- [ ] One data pair per point, x in km from 0 to the total distance, y equal to the point's elevation.
- [ ] Points without elevation are `null` and `connectNulls` is false.
- [ ] `sampling: 'lttb'`, `animation: false`, `showSymbol: false` are set.
- [ ] y-axis uses `scale: true`; x-axis `min: 0` and `max` = total distance.
- [ ] Tooltip text uses the shared formatters ("1.23 km · 245 m").

## Component tests – mocked ECharts
- [ ] One chart instance per mount; a new track calls `setOption` with `notMerge: true` on the same instance.
- [ ] Track without elevation → no chart instance, empty-state text visible in region "Elevation chart".
- [ ] Switching to and from a track without elevation disposes and re-creates the chart.
- [ ] ResizeObserver triggers `resize`; unmount disposes the chart and disconnects the observer.
- [ ] `App` shows the "Elevation chart" region only after a successful upload.

## E2E – Playwright
- [ ] `run.gpx` shows a canvas in the "Elevation chart" region.
- [ ] Hovering the chart shows a tooltip with distance and elevation.
- [ ] `no-ele-time.gpx` shows the empty state and no canvas.
- [ ] Loading another file reuses the region without duplicating the chart.

## Manual – desktop browser (`npm run dev`)
- [ ] `run.gpx`, `bike.gpx` and every file in `GpxFiles/` show an elevation profile whose x-axis ends at the total distance shown in the summary.
- [ ] The profile shape is plausible (e.g. the kayak file is nearly flat; the bike file shows its climbs).
- [ ] `bike.gpx` shows a continuous line across the segment boundary.
- [ ] Resizing the browser window resizes the chart without distortion or overflow.
- [ ] `no-ele-time.gpx` shows the empty-state card at the same height as the chart.
- [ ] **Large-track performance:** with the largest file in `GpxFiles/`, the chart appears without a noticeable freeze and hovering the tooltip stays smooth.

## Design
- [ ] ECharts is imported only through `src/ui/charts/echarts.ts` from `echarts/core` (tree-shaken); no wrapper library.
- [ ] `buildElevationOption` is pure; display-unit conversion happens there, metrics stay SI.
- [ ] Chart data index equals point index (one entry per point, same order).
- [ ] Lint forbids `echarts` in `model`/`parser`/`metrics`.
- [ ] Styles use CSS modules; colours and sizes live in `chartTheme.ts`.
- [ ] Only new dependency is `echarts`; no module over ~200 lines.
- [ ] The GPX file never leaves the browser; no new external requests.

## Merge gate
- [ ] All Phase 7 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the roadmap checkboxes.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
