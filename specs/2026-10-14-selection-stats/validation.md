# Validation – Phase 13: Selection stats

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-selection-stats`, rebased on `main` with Phases 10–12 merged.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–12. The Phase 9 metric tests pass **unchanged** (only the empty-track `getTrackMetrics` expectation gains `settleIgnored: []`).
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Correctness – reference values
- [ ] The `TBD` cells in `requirements.md` are filled from the independent script before app code changed, and the script's full-range values match the Phase 9 reference table.
- [ ] The fixture rows (`run.gpx` [30, 119], `bike.gpx` [50, 149], `no-ele-time.gpx` [10, 59]) match within: speeds ±0.01 km/h, HR ±0.05 bpm, distance ±0.5 m, duration and gain to the displayed unit.
- [ ] Manual: the `GpxFiles/` rows (kayak [0, 999], bike [500, 1499], run [100, 399]) match the app when those ranges are selected (rounded as displayed). For kayak, Max speed excludes the start-up spike.

## Correctness – invariants (unit-tested)
- [ ] Full range = `metrics.totals` for all fixtures and the 100 000-point track.
- [ ] Adjacent ranges [a, m] + [m, b]: distance, duration and moving time add up exactly to [a, b].
- [ ] Max speed of [a, b] = max of the halves.
- [ ] Without a `range` argument, every Phase 9 function returns exactly what it did before.
- [ ] A range starting mid-track never creates a new settle window (whole-track mask).

## Performance
- [ ] `getRangeStats` on the full 100 000-point track: fastest of 10 runs under 16 ms (unit test).
- [ ] `getTrackMetrics` on 100 000 points still under 1 s.
- [ ] Manual: on a 100 000-point synthetic GPX, the summary numbers update smoothly while dragging a brush, and the brush and map highlight don't lag behind the cursor.

## E2E (`e2e/selection-stats.spec.ts`)
- [ ] Brushing switches the summary to "Selection · …" with the `dl` labelled "Selection stats", and Distance is smaller than the whole track's.
- [ ] Stats change during the drag, before release.
- [ ] "Show whole track" and Esc restore the whole-track stats.
- [ ] `bike.gpx` time-axis brush across the pause: Duration includes the pause, Avg speed excludes it.
- [ ] 375 × 667: no horizontal page scroll with a selection line shown.

## Manual – desktop and real phone (`npm run dev`)
- [ ] Desktop, every file in `GpxFiles/`: the stats follow the brush on both charts, on the Distance and Time axes, zoomed and unzoomed.
- [ ] The stat labels, order and formatting are identical for the whole track and a selection; no Avg pace, no Elevation loss.
- [ ] `no-ele-time.gpx`: no selection can be made (both charts are empty), and the summary shows only Distance with no errors.
- [ ] Real phone: brushing with a finger updates the summary, and "Show whole track" is easy to tap.
- [ ] Loading a second file shows its whole-track stats.

## Design
- [ ] `getRangeStats` and the range-aware functions are pure, live in `src/metrics/`, and have no UI imports (lint enforces it).
- [ ] The summary and the selection go through the same `getRangeStats` (`getTrackMetrics` totals use it).
- [ ] The settle mask is computed once per track, never per selection.
- [ ] Metrics stay SI; formatting only in `src/ui/format.ts`.
- [ ] Brushing doesn't re-render `App`, the map or the charts' option building, only the summary.
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 13 checkboxes in `specs/roadmap.md` are ticked, with the stats line matching the decided set.
- [ ] Phase 5–12 validations still hold, and the Phase 9 summary validation still holds when nothing is selected.
- [ ] Existing `specs/` files are unchanged except for the roadmap.
- [ ] No files from `GpxFiles/` are committed, and the reference script is not committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
