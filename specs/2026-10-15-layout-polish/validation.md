# Validation – Phase 15: Layout and polish

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-15-layout-polish`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests (metric formatting unchanged).
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed; the sample is same-origin).
- [ ] `npm run build` produces `dist/` including `sample.gpx`.

## Units
- [ ] The header switch defaults to Metric and is usable before a file is loaded.
- [ ] Imperial: summary ("mi"/"ft", "mph", "ft"), selection line, chart x-axis ("mi"), elevation axis ("ft"), speed ("mph"), pace ("/mi", capped at 30), tooltips and the map scale bar all switch; HR and cadence unchanged.
- [ ] Switching keeps zoom, selection and hover on the same points.
- [ ] The choice survives a reload; blocked storage falls back to Metric without errors.

## Touch (Playwright at 375 × 667, and a real phone)
- [ ] A one-finger vertical swipe over the map or a chart scrolls the page and doesn't pan the map or change the selection.
- [ ] A one-finger horizontal drag on a chart still selects; a pinch on a chart still zooms and keeps the selection.
- [ ] A pinch and a two-finger drag on the map zoom and pan it.
- [ ] Every visible button and radio is at least 44 × 44 px, including the map's zoom buttons.
- [ ] No horizontal page scroll in the empty, error, loaded and selection states.
- [ ] Desktop: map drag, wheel zoom and chart brushing behave as before.

## States
- [ ] Empty: intro text, privacy note and "Try a sample track", which loads the run sample with no external request.
- [ ] Loading: "Reading <name>…" with a spinner; drop zone and sample button disabled.
- [ ] Error: "Couldn't open <name>" with the message and a Dismiss button; a loaded track stays.
- [ ] Loaded: the drop zone is a compact row.

## Layout
- [ ] Phones: single column, 16 px gutters. Desktop ≥ 1024 px: 64 rem column.
- [ ] The map is between 280 and 600 px tall.

## Design
- [ ] Unit conversion happens only in `src/ui/format.ts`, `src/ui/units/` and the chart builders' display values; metrics stay SI.
- [ ] `SegmentedControl` lives in `src/ui/common/`; no duplicated toggle code.
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 15 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 4–14 validations still hold (metric output unchanged).
- [ ] No files from `GpxFiles/` are committed.
