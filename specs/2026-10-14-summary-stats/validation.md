# Validation – Phase 9: Summary stats

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-summary-stats`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–8 (updated only where the summary changed).
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – metrics
- [ ] Moving time excludes stops and segment pauses; constant motion gives moving time = duration.
- [ ] Never moving → `movingTime` 0 and `avgSpeed` `null`; no time → moving stats, avg and max speed `null`.
- [ ] Max speed is the largest value of the 5 s smoothed series outside ignored settle windows (Amendment A).
- [ ] Avg HR is time-weighted (uneven sampling case gives 154, not 130), excludes segment pauses, falls back to the plain mean without time, and is `null` without HR.
- [ ] Fixture totals match the reference table in `requirements.md` (speeds ±0.01 km/h, HR ±0.05 bpm, moving time exact).
- [ ] 100 000-point synthetic track still computes in under 1 s.
- [ ] `formatHeartRate` gives "144 bpm" for 143.82.

## Component and E2E tests
- [ ] `run.gpx` summary: heading "Run fixture", file name "run.gpx", and exactly Distance, Duration, Elevation gain, Avg speed "8.2 km/h", Max speed "13.6 km/h", Avg HR "144 bpm", in that order.
- [ ] No "Track", "Points" or "Elevation loss" entries for any fixture.
- [ ] `no-ele-time.gpx` summary shows only Distance "1.72 km".
- [ ] A file without a track name shows the file name as the heading.
- [ ] Playwright: `bike.gpx` shows "17.5 km/h", "33.7 km/h", "156 bpm" under heading "Bike fixture".
- [ ] Playwright: no horizontal page scroll at 375 px width with a loaded track.

## Manual – desktop and phone-width browser (`npm run dev`)
- [ ] Each file in `GpxFiles/` shows avg speed, max speed and avg HR matching the independent reference values in `requirements.md` (rounded as displayed).
- [ ] Compared with Garmin Connect for the same activities: avg speed and avg HR within ~5% (note the numbers in the PR description).
- [ ] The heading reads well with long track and file names, and the file name wraps below the track name on a narrow window.
- [ ] Loading a second file updates all stats; a bad file leaves them unchanged.

## Design
- [ ] New metrics code is pure, imports only from `src/model` and sibling metrics modules, and has no UI dependencies (lint enforces it).
- [ ] Metrics stay SI (s, m, m/s, bpm); formatting only in `src/ui/format.ts`.
- [ ] `getTrackMetrics` still runs once per loaded track; the new totals reuse its `distance`, `elapsed` and `speed` arrays (no second pass over speed).
- [ ] `elevationLoss` is still in `TrackTotals`.
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 9 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 6–8 validations still hold, apart from the summary items superseded here.
- [ ] Existing `specs/` files are unchanged except for the roadmap, the phase renumbering and the superseded notes.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).

## Amendment A – Max speed settle filter
Holds on a clean checkout of branch `2026-10-14-max-speed-settle`, in addition to everything above.

Automated:
- [ ] Lint, format check, `tsc -b`, unit tests, e2e tests and build all exit 0.
- [ ] A start-up spike, and the same spike after a > 10 s recording gap or at a second segment's start, is ignored, including its decaying tail.
- [ ] A gap of 10 s or less does not start a settle window.
- [ ] Real 5, 10 and 20 s mid-track sprints, a 15 s sprint from the start, and a standing-then-sprint start all keep their true max.
- [ ] Steady speed with small noise in the first 10 s ignores nothing (σ floor).
- [ ] All speeds ignored → plain max; no speed → `null`.
- [ ] Fixture max speeds unchanged: `run.gpx` 13.60 km/h, `bike.gpx` 33.73 km/h; existing summary tests pass unchanged.
- [ ] The 100 000-point tracks (with and without a gap every 30 s) compute in under 1 s.

Manual (`npm run dev`):
- [ ] Kayak file: Max speed "10.6 km/h" (was 20.5); bike "41.9 km/h" and run "15.7 km/h" unchanged.
- [ ] The speed chart still shows the kayak start-up spike (chart not filtered).

Design:
- [ ] `getMaxSpeed` is pure, lives in `src/metrics/maxSpeed.ts`, and its thresholds are named constants.
- [ ] Only `totals.maxSpeed` changes; the `speed`/`pace` series, moving time and avg speed are untouched.
- [ ] No new dependencies; no module over ~200 lines.

Merge gate:
- [ ] The Amendment A item in `specs/roadmap.md` (Phase 9) is ticked.
- [ ] Only the Phase 9 spec files, the roadmap and the code/tests for this amendment changed.
- [ ] No files from `GpxFiles/` are committed.
