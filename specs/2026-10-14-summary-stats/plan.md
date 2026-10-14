# Plan – Phase 9: Summary stats

Goal: whole-track stats at a glance (see `specs/roadmap.md`, Phase 9). API and behavior in `requirements.md`.

## 1. Moving stats
1. Create `src/metrics/movement.ts` with `MovingStats` and `getMovingStats(track, distance, elapsed, speed)`: per segment, walk consecutive timed points; add Δt and Δdistance when the later point's speed is ≥ `STOPPED_SPEED`; `null` when no point has time.
2. Add `src/metrics/movement.test.ts` with synthetic tracks (points 1 s apart):
   - Constant 3 m/s → moving time = duration, moving distance = total distance.
   - Stationary track → moving time 0, distance 0.
   - Moving, a 20 s stop, moving → the stop is excluded (moving time < duration by about the stop).
   - Two segments with a long pause → the pause is never counted.
   - Track without time → `null`.
   - Fixtures: `run.gpx` 644 s; `bike.gpx` 517 s.

## 2. Average heart rate
1. Create `src/metrics/heartRate.ts` with `getAverageHeartRate(track, elapsed)` following the time-weighted rule, with the plain-mean fallback.
2. Add `src/metrics/heartRate.test.ts`:
   - Even 1 s sampling → equals the plain mean.
   - Uneven sampling (100 bpm held 1 s, 160 bpm held 9 s) → 154, not the plain mean 130.
   - Interval across a segment boundary is excluded.
   - HR without time → plain mean; no HR → `null`; empty track → `null`.
   - Fixtures: `run.gpx` 143.82, `bike.gpx` 155.95 (±0.05); `no-ele-time.gpx` `null`.

## 3. Track totals
1. Extend `TrackTotals` and `getTrackMetrics` with `movingTime`, `avgSpeed`, `maxSpeed`, `avgHeartRate` (reuse the already computed `distance`, `elapsed`, `speed`).
2. Re-export the new functions and `MovingStats` from `src/metrics/index.ts`.
3. Extend `src/metrics/trackMetrics.test.ts`: reference totals for all three fixtures (`run.gpx` 8.21 / 13.60 km/h, 143.82 bpm; `bike.gpx` 17.48 / 33.73 km/h, 155.95 bpm; `no-ele-time.gpx` all `null`), empty track → new totals `null`, a never-moving track → `avgSpeed` `null`, and the 100 000-point track still under 1 s.

## 4. Formatting and summary UI
1. Add `formatHeartRate` to `src/ui/format.ts`; tests: 143.82 → "144 bpm", 155.95 → "156 bpm", 60 → "60 bpm".
2. `TrackSummary`: header row with the track-name `<h2>` and the muted file-name `<p>` (file-name `<h2>` when unnamed); stats Distance, Duration, Elevation gain, Avg speed, Max speed, Avg HR, skipping `null`; remove Track, Points and Elevation loss. Styles in `TrackSummary.module.css` (flex row, wrap, muted file name).
3. Update `src/ui/App.test.tsx`:
   - `run.gpx` → heading "Run fixture", file name "run.gpx"; stats exactly Distance "1.47 km", Duration "10:44", Elevation gain "6 m", Avg speed "8.2 km/h", Max speed "13.6 km/h", Avg HR "144 bpm".
   - `no-ele-time.gpx` → only Distance "1.72 km".
   - A GPX without `<name>` → the file name is the heading.
   - Existing tests that look up the heading by file name now use the track name or the file-name text.

## 5. Playwright
1. Update `e2e/upload.spec.ts`: `bike.gpx` summary shows heading "Bike fixture", "bike.gpx", "2.52 km", "11:57", "22 m", "17.5 km/h", "33.7 km/h", "156 bpm", and no "Points" or "Elevation loss" labels.
2. Update other specs that wait for the file-name heading (`map`, `elevation-chart`, `speed-chart`) to the new heading.
3. At a 375 × 667 viewport, the summary has no horizontal overflow (`scrollWidth <= clientWidth` on the page).

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/` against the reference values (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 9 checkboxes in `specs/roadmap.md`.
