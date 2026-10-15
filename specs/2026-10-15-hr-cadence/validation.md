# Validation – Phase 14: HR and cadence

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-15-hr-cadence`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–13 (updated only where the chart count, slider position or summary list changed). `heartRate.test.ts` passes unchanged.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Correctness
- [ ] Max HR, Avg cadence and Max cadence match the reference table in `requirements.md` for the fixtures (cadence ±0.01 rpm, maxima exact), for the whole track and the listed ranges.
- [ ] Zero cadence samples are left out of Avg cadence; all-zero cadence gives `null`.
- [ ] Avg HR is unchanged for every fixture.
- [ ] Full range = whole-track totals for the new fields.
- [ ] Manual: `GpxFiles/` values match the table (rounded as displayed).

## Charts
- [ ] `run.gpx`: four charts in the order Elevation, Speed, Heart rate, Cadence; the slider only under Cadence.
- [ ] `bike.gpx`: no Cadence card; slider under Heart rate. `no-ele-time.gpx`: no sensor cards; slider under Elevation.
- [ ] Hovering, zooming and brushing a sensor chart drives the map and the other charts, and vice versa, on both x-axis modes.
- [ ] Tooltips read "… · 152 bpm" / "… · 82 rpm"; y-axis labels are whole numbers with units.
- [ ] Hovering doesn't re-render any React component (App test).

## Summary
- [ ] `run.gpx` shows Distance, Duration, Elevation gain, Avg speed, Max speed, Avg HR, Max HR, Avg cadence, Max cadence, in that order.
- [ ] Tracks without the field hide its stats; selection stats include the new fields.

## Manual – desktop and phone width (`npm run dev`)
- [ ] Every file in `GpxFiles/`: sensor charts appear exactly when the badges say the data exists.
- [ ] Phone width: four charts stack, no horizontal scroll, the summary wraps cleanly.

## Design
- [ ] Sensor metrics are pure, in `src/metrics/`, no UI imports; values in bpm/rpm, formatting only in `src/ui/format.ts`.
- [ ] One `SensorChart` and one `buildSensorOption` serve both charts; no duplicated chart wiring.
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 14 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 5–13 validations still hold.
- [ ] No files from `GpxFiles/` and no reference script are committed.
