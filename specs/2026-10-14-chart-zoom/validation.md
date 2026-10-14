# Validation – Phase 11: Chart zoom

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-chart-zoom`, rebased on `main` with Phase 10 merged.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–10.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests
- [ ] `setZoom` coalesces per frame, normalises the whole-track range to `null`, and doesn't re-render hover-only subscribers.
- [ ] `rangeToX` / `xToRange` round-trip on both axes; time-axis windows inside a segment break give `null`.
- [ ] `buildDataZoom`: wheel zoom on, mouse-move pan off, `filterMode: 'filter'`, minimum span 50 m / 30 s, slider only when asked.
- [ ] Zooming one chart dispatches the same point range to the other, with no feedback loop.
- [ ] The x-axis toggle and the speed/pace switch keep the zoom.
- [ ] The slider sits on the last chart with data.
- [ ] "Reset zoom" is disabled when not zoomed and resets the store to `null`.

## Performance
- [ ] Manual: on a 100 000-point synthetic GPX, wheel zoom and slider drag stay smooth (no visible stutter), and the other chart follows within a frame.
- [ ] Zoomed in, the chart shows full-resolution detail (LTTB re-samples the visible window): small bumps hidden at full view become visible.

## E2E (`e2e/chart-zoom.spec.ts`)
- [ ] The wheel zooms both charts to the same range (matching tooltip values at the same fraction).
- [ ] A plain drag on the plot area doesn't pan.
- [ ] The slider pans both charts.
- [ ] The Time axis keeps the zoomed section.
- [ ] Reset restores the full view.
- [ ] 375 × 667: no horizontal page scroll; Reset is at least 44 × 44 px.

## Manual – desktop and real phone (`npm run dev`)
- [ ] Desktop, every file in `GpxFiles/`: wheel zoom, slider pan/resize and Reset work, and both charts always show the same section.
- [ ] Hovering inside a zoomed view still moves the map marker. Hovering the map at a point outside the window hides that chart's pointer and nothing breaks.
- [ ] The map doesn't move or change when zooming.
- [ ] `no-ele-time.gpx`: both charts are empty, the toolbar shows Reset disabled, and there are no console errors.
- [ ] Real phone: pinch zooms both charts, the slider can be dragged with a finger, and Reset is easy to tap.
- [ ] Loading a second file resets the zoom.

## Design
- [ ] Zoom is stored as a point-index range only; x values never enter the store.
- [ ] Zoom and hover linking both go through the view store; no `echarts.connect`.
- [ ] Only `DataZoomComponent` was added to the ECharts registrations (no full `echarts` import).
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 11 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 5–10 validations still hold.
- [ ] Existing `specs/` files are unchanged except for the roadmap.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
