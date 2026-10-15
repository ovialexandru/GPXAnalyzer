# Plan – Phase 13: Selection stats

Goal: stats for the selection, or the whole track if none (see `specs/roadmap.md`, Phase 13). API, rules and reference ranges in `requirements.md`.

## 0. Branch
1. Work on branch `2026-10-14-selection-stats`; rebase onto `main` after Phase 12 is merged.

## 1. Reference values
1. Write an independent script outside `src/` (not committed): regex GPX parsing, brute-force windows, using the rules in `requirements.md` and Phase 9 (5 s speed window, 0.5 m/s stopped threshold, settle filter on the whole track, 3 m hysteresis per range).
2. Compute the six reference rows and fill the `TBD` cells in `requirements.md` (distance in m, duration in s, gain in m, speeds in km/h to 0.01, HR to 0.01 bpm).
3. Sanity check: the script's full-range values match the Phase 9 reference table (`run.gpx` 8.21 / 13.60 km/h / 143.82 bpm, `bike.gpx` 17.48 / 33.73 km/h / 155.95 bpm, kayak max 10.57 km/h).

## 2. Range-aware Phase 9 functions
1. Add `clipSegmentRanges(track, range)` to `src/metrics/segments.ts`, with tests: a range inside one segment, a range spanning `bike.gpx`'s boundary at 100, a range ending exactly on a segment start.
2. Add the optional `range` to `getMovingStats`, `getAverageHeartRate`, `getElevationChange` (all iterate the clipped parts). Without `range`, the results must stay identical, so the existing tests pass unchanged.
3. Split `maxSpeed.ts` into `getSettleIgnored` (boolean mask) and `getMaxSpeedInRange`; `getMaxSpeed` keeps its signature and results.
4. Add range cases to `movement.test.ts`, `heartRate.test.ts`, `elevation.test.ts`, `maxSpeed.test.ts`:
   - Only intervals inside the range count; a pause between segments inside the range isn't counted.
   - Elevation hysteresis anchors at the range's first elevation.
   - The kayak-style settle spike at index 0 stays ignored for a range starting at 0. A range starting at index 50 has no new settle window at its start.

## 3. `getRangeStats` and `TrackMetrics`
1. Move `PointRange` to `src/metrics/segments.ts` (next to `clipSegmentRanges`, which needs it; the UI store re-exports it). Add `src/metrics/rangeStats.ts` with `TrackTotals` (moved from `trackMetrics.ts`), `TrackSeries` and `getRangeStats`.
2. In `getTrackMetrics`, compute the series (with `settleIgnored`) once, then `totals = getRangeStats(track, series, [0, n − 1])`; an empty track keeps today's zero/null totals.
3. Re-export from `src/metrics/index.ts`.
4. Add `src/metrics/rangeStats.test.ts`:
   - Fixture reference rows from group 1 (speeds ±0.01 km/h, HR ±0.05 bpm, distance ±0.5 m, duration and gain exact to the displayed unit).
   - The invariants in `requirements.md`: full range = `totals`; additivity of distance, duration and moving time on adjacent ranges; max speed = max of the halves.
   - A 2-point range; an untimed range (`no-ele-time.gpx`) → only distance and gain non-null.
   - Performance: `getRangeStats` on the full 100 000-point track: the fastest of 10 runs is under 16 ms (the mean is inflated by parallel test workers: ~5 ms alone, ~16 ms under the full suite), and `getTrackMetrics` stays under 1 s.
5. `trackMetrics.test.ts` passes with the same totals; only the empty-track expectation gains `settleIgnored: []`.

## 4. Summary UI
1. Create `useDisplayedStats(track, metrics)` in `src/ui/view/`: subscribe to `selection`, memoise `getRangeStats` per selection, and return `metrics.totals` when `null`.
2. `App` passes `useDisplayedStats` output to `TrackSummary`, or `TrackSummary` calls the hook itself; keep `App` free of per-frame re-renders.
3. `TrackSummary`: when `selection` is set, render the "Selection · {start} – {end}" line (`formatDistance` of `distance[first]` / `distance[last]`) and a "Show whole track" button that calls `setSelection(null)`. `dl` gets `aria-label` "Whole-track stats" or "Selection stats". Stat list unchanged. Styles in `TrackSummary.module.css` (wrapping).
4. Tests in `App.test.tsx` / a `TrackSummary` test:
   - No selection → the Phase 9 values for `run.gpx`, unchanged.
   - Store selection [30, 119] on `run.gpx` → the reference values formatted ("x.xx km", "m:ss", "n m", "x.x km/h", "nnn bpm"), the selection line, and the `dl` labelled "Selection stats".
   - "Show whole track" → whole-track values back, line gone.
   - Selection on `no-ele-time.gpx` → only Distance.

## 5. Roadmap and Playwright
1. In `specs/roadmap.md` Phase 13, the stats line reads "Distance, duration, elevation gain, avg/max speed, avg HR (the Phase 9 summary set)" (already done on the spec commit).
2. Move `canvasBox`, `brush`, `touches` and `touchBrush` from `e2e/range-selection.spec.ts` to `e2e/helpers.ts`, then create `e2e/selection-stats.spec.ts` with `run.gpx`:
   - Record the summary Distance. Brush 0.3 → 0.6 on the elevation chart → the summary shows "Selection · …", the `dl` is labelled "Selection stats", and Distance is smaller than the whole track's.
   - Widening the brush (a new drag 0.1 → 0.9) makes Distance larger, so the stats follow the brush.
   - During a slow drag (several `mouse.move` steps), the Distance text changes before the mouse is released (live update).
   - "Show whole track" and Esc both restore the whole-track values.
   - `bike.gpx`: a time-axis brush across the pause gives a Duration over 177 s (includes the pause) and an Avg speed well above distance ÷ duration (excludes it).
   - 375 × 667: a finger drag shows the selection line, which wraps without horizontal page scroll; "Show whole track" is at least 44 px tall and clears it on tap.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/` against the reference rows, on desktop and a real phone (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 13 checkboxes in `specs/roadmap.md`.
