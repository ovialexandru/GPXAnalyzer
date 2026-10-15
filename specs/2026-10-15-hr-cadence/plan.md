# Plan – Phase 14: HR and cadence

Goal: optional sensor data (see `specs/roadmap.md`, Phase 14). API, rules and reference values in `requirements.md`.

## 1. Sensor metrics
1. Create `src/metrics/sensors.ts` with `getSensorStats` (average and max in one pass) and `getCadenceStats`; turn `getAverageHeartRate` into a wrapper. `heartRate.test.ts` passes unchanged.
2. Add `src/metrics/sensors.test.ts`:
   - Time weighting and the plain-mean fallback for cadence; zero cadence samples skipped (also in the fallback); all zeros → `null`.
   - Max over a range, with missing samples, and `null` without the field; all-zero cadence → average `null`, max 0.
   - Fixture and range values from the reference table (cadence ±0.01 rpm, max exact).

## 2. Totals
1. `TrackTotals` gains `maxHeartRate`, `avgCadence`, `maxCadence`; `getRangeStats` fills them; the empty-track totals get `null`s.
2. Re-export the new functions and `SensorField` from `src/metrics/index.ts`.
3. Extend `rangeStats.test.ts` / `trackMetrics.test.ts`: reference rows, full range = totals, max of a range = max of its halves.
4. Keep `getRangeStats` per-frame fast with the extra fields: one pass per sensor, named field reads, `timedSpan` scanning in from both ends. The 100 000-point guard warms up first and allows 32 ms (see Decisions).

## 3. Summary
1. Add `formatCadence` to `src/ui/format.ts` with tests (69.25 → "69 rpm").
2. `TrackSummary`: Max HR, Avg cadence, Max cadence after Avg HR.
3. Tests: `run.gpx` summary shows all nine stats in order; `bike.gpx` has Max HR "166 bpm" and no cadence stats; a `run.gpx` selection [30, 119] shows "159 bpm", "71 rpm", "77 rpm".

## 4. Charts
1. `chartTheme.ts`: `COLORS.heartRate`, `COLORS.cadence`.
2. Create `src/ui/charts/sensorOption.ts` (`buildSensorOption` on top of `buildLineOption`) with tests: y values per point (null where missing), color, `scale: true`, tooltip and label formatting, segment breaks on the time axis for `bike.gpx`.
3. Create `src/ui/charts/SensorChart.tsx` (card "Heart rate chart" / "Cadence chart", heading "Heart rate" / "Cadence") using `useECharts`, `useChartZoom`, `useChartBrush`, `useChartHover` with the new hover sources.
4. `ChartsPanel`: render each sensor chart only when `getAvailableFields` has it; put the slider under the last chart shown.
5. Tests:
   - `SensorChart.test.tsx`: option replaced on track/mode change; hover/zoom/brush hooks wired (store round trips).
   - `ChartsPanel.test.tsx`: `run.gpx` → 4 charts, slider only on cadence; `bike.gpx` → 3 charts, slider on heart rate; `no-ele-time.gpx` → no sensor charts, slider on elevation. Update the existing counts and "elevation then speed" assumptions.
   - `App.test.tsx`: hover linking stays render-free with four charts.

## 5. Playwright
1. Create `e2e/hr-cadence.spec.ts`:
   - `run.gpx`: "Heart rate chart" and "Cadence chart" have one canvas each; the tooltip on each reads "… · nnn bpm" / "… · nn rpm"; the summary shows Max HR "159 bpm", Avg cadence "69 rpm", Max cadence "79 rpm".
   - `bike.gpx`: heart rate chart shown, no cadence chart, no cadence stats; the slider is in the heart rate card.
   - `no-ele-time.gpx`: neither chart.
   - Hover on the cadence chart moves the map's hover marker; a brush on the heart rate chart highlights the map and switches the summary to the selection; zooming the heart rate chart enables Reset zoom.
   - 375 × 667 with `run.gpx`: no horizontal page scroll.
2. Update existing specs that assume two charts or the slider on the speed chart: `chart-zoom.spec.ts` drags the slider under the cadence chart; `chart-zoom` and `hover-linking` use a 4400 px tall desktop viewport so the taller page still fits.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual: every file in `GpxFiles/` against the reference table, desktop and phone width (see `validation.md`).
3. Tick the Phase 14 checkboxes in `specs/roadmap.md`.
