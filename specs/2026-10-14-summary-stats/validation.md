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
- [ ] Max speed is the largest value of the 5 s smoothed series.
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
- [ ] Compared with Garmin Connect for the same activities: avg speed and avg HR within ~5% (note the numbers in the PR description; known difference: kayak max speed from the start-up GPS spike).
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
