# Plan – Phase 6: Derived metrics

Goal: computed series and totals (see `specs/roadmap.md`, Phase 6). API and behavior in `requirements.md`.

## 1. Distance
1. Create `src/metrics/distance.ts` with `haversineDistance` (R = 6 371 008.8 m) and `getCumulativeDistance`.
2. `getCumulativeDistance` walks `points` once; at each `segmentStarts` entry after the first, repeat the previous value instead of adding the gap.
3. Add `src/metrics/distance.test.ts`:
   - Same point → 0; 1° of latitude on the equator → 111 194.9 m (±0.1 m); symmetric for `a, b` and `b, a`.
   - Series length equals `points.length`, starts at 0, never decreases.
   - Synthetic two-segment track: the value at the second segment's first point equals the previous value.
   - Fixtures: last value of `run.gpx` 1469.0 m, `bike.gpx` 2519.1 m, `no-ele-time.gpx` 1721.0 m (each ±0.5 m).
   - Empty track → `[]`.

## 2. Elapsed time, speed and pace
1. Create `src/metrics/speed.ts` with `STOPPED_SPEED`, `getElapsedTime`, `getSpeedSeries` and `getPaceSeries`.
2. `getElapsedTime`: seconds since the first point that has `time`; `null` where `time` is missing.
3. `getSpeedSeries`: per segment, two pointers `lo`/`hi` that only move forward, bounding the centred `windowSeconds` window; if the window holds only point *i*, use `i − 1`/`i + 1` within the segment; `null` for missing time, single-point segments or Δtime ≤ 0.
4. `getPaceSeries`: `1 / speed` when `speed ≥ STOPPED_SPEED`, else `null`.
5. Add `src/metrics/speed.test.ts` with synthetic tracks (points 1 s apart):
   - Constant 10 m/s straight line → every speed ≈ 10 m/s (±0.01), pace ≈ 0.1 s/m.
   - Stationary points → speed 0, pace `null`; 0.4 m/s → pace `null`; 0.6 m/s → pace ≈ 1.667 s/m.
   - Points every 10 s (wider than the window) → neighbour fallback gives the right speed.
   - Two segments with a long pause → the speed near the boundary uses only its own segment (no drop caused by the pause).
   - A point without time → `elapsed`, `speed`, `pace` `null` there; neighbours unaffected.
   - Single-point segment → speed `null`. Track without time → all `null`.
   - A single 1 s GPS spike (one point jumped 20 m sideways) is reduced by the 5 s window compared to raw point-to-point speed.

## 3. Elevation gain/loss
1. Create `src/metrics/elevation.ts` with `getElevationChange(track, threshold = 3)` following the hysteresis rule in `requirements.md`.
2. Add `src/metrics/elevation.test.ts`:
   - Steady climb 0 → 100 m in 1 m steps → gain 99, loss 0 (the last < 3 m is not counted).
   - ±1–2 m noise around a flat line → gain 0, loss 0.
   - Climb 50 m then descend 50 m → gain 50, loss 50 (±3).
   - `threshold` parameter: same noisy data with `threshold = 1` counts more gain than the default.
   - Points without elevation are skipped; no elevation at all → `null`.
   - Hysteresis continues across a segment boundary.
   - Fixtures: `run.gpx` 6.0 / 3.2 m, `bike.gpx` 22.4 / 17.6 m (±0.1), `no-ele-time.gpx` `null`.

## 4. Track metrics
1. Create `src/metrics/trackMetrics.ts` with `TrackTotals`, `TrackMetrics` and `getTrackMetrics`, composing the functions above (distance and elapsed computed once and passed on).
2. Re-export everything from `src/metrics/index.ts`.
3. Add `src/metrics/trackMetrics.test.ts`:
   - Every series has `points.length` entries for all three fixtures.
   - Totals match the reference values (`run.gpx` 1469.0 m / 644 s / 6.0 / 3.2 m; `bike.gpx` 2519.1 m / 717 s / 22.4 / 17.6 m; `no-ele-time.gpx` 1721.0 m / `null` / `null` / `null`).
   - Empty track → empty series, `distance: 0`, other totals `null`.
   - A synthetic 100 000-point track computes in under 1 s (guards against O(n²)).

## 5. Formatting and summary UI
1. Create `src/ui/format.ts` with `formatDistance`, `formatDuration`, `formatElevation`, and `src/ui/format.test.ts`: 0 → "0 m", 850 → "850 m", 999 → "999 m", 1000 → "1.00 km", 2519.1 → "2.52 km"; 0 → "0:00", 644 → "10:44", 3723 → "1:02:03"; 22.4 → "22 m".
2. In `App.tsx`, compute `metrics = useMemo(() => loaded && getTrackMetrics(loaded.track), [loaded])` and pass `metrics.totals` to `TrackSummary`.
3. `TrackSummary` renders Distance, Duration, Elevation gain, Elevation loss as extra `dt`/`dd` pairs, skipping `null` values.
4. Extend `src/ui/App.test.tsx`: after uploading `run.gpx` the summary shows "1.47 km", "10:44", "6 m", "3 m"; after `no-ele-time.gpx` it shows "1.72 km" and no Duration/Elevation entries.

## 6. Playwright
1. Extend `e2e/upload.spec.ts`: upload `bike.gpx` → summary shows "2.52 km", "11:57", "22 m", "18 m".

## 7. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/` against the reference values and the Garmin Connect totals (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 6 checkboxes in `specs/roadmap.md`.
