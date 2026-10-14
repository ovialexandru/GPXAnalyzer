# Validation – Phase 6: Derived metrics

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-metrics-and-charts` at the Phase 6 commit.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing parser, fixture, upload and map tests.
- [ ] `npm run test:e2e` passes in Chromium.
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – distance
- [ ] Haversine: 1° latitude on the equator = 111 194.9 m (±0.1 m); 0 for the same point; symmetric.
- [ ] Cumulative distance starts at 0, never decreases, and has one entry per point.
- [ ] Segment gaps are not counted: `bike.gpx` totals 2519.1 m, not ≈ 3218.6 m.
- [ ] Fixture totals: `run.gpx` 1469.0 m, `no-ele-time.gpx` 1721.0 m (±0.5 m).

## Unit tests – speed and pace
- [ ] Constant-speed synthetic track gives that speed (±0.01 m/s) at every point, including the ends.
- [ ] Sparse recording (10 s spacing) still gives correct speeds via the neighbour fallback.
- [ ] The speed window never crosses a segment boundary.
- [ ] Missing time → `null` elapsed/speed/pace for that point only; track without time → all `null`.
- [ ] Pace is `1 / speed` at or above 0.5 m/s and `null` below it; stopped points have speed 0.
- [ ] A one-point GPS spike is damped compared to raw point-to-point speed.

## Unit tests – elevation
- [ ] Steady 1 m-step climb 0 → 100 m gives gain 99, loss 0.
- [ ] ±1–2 m noise on flat ground gives gain 0, loss 0.
- [ ] Custom `threshold` changes the result; default is 3 m.
- [ ] No elevation → `null`. Fixtures: `run.gpx` 6.0 / 3.2 m, `bike.gpx` 22.4 / 17.6 m (±0.1 m).

## Unit tests – track metrics and formatting
- [ ] `getTrackMetrics` series all have `points.length` entries; totals match the reference table in `requirements.md`.
- [ ] Empty track → empty series, distance 0, other totals `null`.
- [ ] 100 000-point synthetic track computes in under 1 s.
- [ ] Formatters: "850 m", "2.52 km", "10:44", "1:02:03", "22 m" as listed in `plan.md`.

## Component and E2E tests
- [ ] `run.gpx` summary shows Distance "1.47 km", Duration "10:44", Elevation gain "6 m", Elevation loss "3 m".
- [ ] `no-ele-time.gpx` summary shows Distance "1.72 km" and no Duration or Elevation entries.
- [ ] Playwright: `bike.gpx` summary shows "2.52 km", "11:57", "22 m", "18 m".

## Manual – desktop browser (`npm run dev`)
- [ ] Each file in `GpxFiles/` shows totals matching the independent reference values in `requirements.md` (distance ±0.1%, duration exact, gain/loss ±1 m).
- [ ] Compared with Garmin Connect for the same activities: distance within ~2%; elevation gain in the same range (barometric/DEM corrections may differ by up to ~20%). Note the numbers in the PR description.
- [ ] Loading a second file updates the totals; a bad file leaves them unchanged.
- [ ] Loading the largest file in `GpxFiles/` shows no noticeable extra delay compared with Phase 5.

## Design
- [ ] All new metrics code is pure, imports only from `src/model`, and has no UI dependencies (lint enforces it).
- [ ] Metrics use SI units only (m, s, m/s, s/m); all formatting is in `src/ui/format.ts`.
- [ ] Series are plain arrays indexed like `track.points`.
- [ ] `getTrackMetrics` runs once per loaded track (`useMemo` in `App`).
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 6 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the roadmap checkboxes.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
