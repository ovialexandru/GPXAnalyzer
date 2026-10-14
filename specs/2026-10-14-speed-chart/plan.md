# Plan – Phase 8: Speed/pace chart and axis toggle

Goal: second chart and x-axis choice (see `specs/roadmap.md`, Phase 8). API and behavior in `requirements.md`.

## 1. Formatting
1. Add `formatSpeed` and `formatPace` to `src/ui/format.ts`.
2. Extend `src/ui/format.test.ts`: 0 → "0.0 km/h", 3.4167 → "12.3 km/h"; 0.312 s/m → "5:12 /km", 0.3 → "5:00 /km"; seconds round so "4:60" never appears (0.29999 → "5:00 /km").

## 2. Shared x-axis helpers
1. Create `src/ui/charts/xAxis.ts` with `XAxisMode`, `LineData`, `buildLineData`, `buildXAxis` and `niceTimeInterval`.
2. `buildLineData`: x = `distance / 1000` (distance mode) or `elapsed` (time mode, `null` x skipped and mapped to no data item); on the time axis insert `[x, null]` before each later segment's first point, with `-1` in `dataToPoint`.
3. `buildXAxis`: distance → km labels, `min: 0`, `max` = total km; time → `min: 0`, `max` = duration, `interval = niceTimeInterval(duration)`, labels via `formatDuration`.
4. Add `src/ui/charts/xAxis.test.ts`:
   - Distance mode: one item per point, `dataToPoint` is identity, no breaks for `bike.gpx`.
   - Time mode, `run.gpx`: 150 items, x from 0 to 644.
   - Time mode, `bike.gpx`: 201 items, exactly one `null` break between the segments with `dataToPoint` `-1`; every other entry maps back to the right point.
   - `niceTimeInterval`: 644 s → 120 s; 2523 s → 600 s; 7731 s → 1800 s; 0 s → 60 s.

## 3. Option builders
1. Change `buildElevationOption(track, metrics, mode)` to use `buildLineData`/`buildXAxis`; tooltip shows distance or elapsed time depending on the mode. Update its tests (distance mode unchanged; time mode has the break for `bike.gpx`).
2. Create `src/ui/charts/speedOption.ts` with `buildSpeedOption(track, metrics, mode, metric)`:
   - Speed: y = `speed × 3.6` (km/h), `min: 0`.
   - Pace: y = `pace × 1000 / 60` (min/km), `inverse: true`, `max: 20`, labels "m:ss".
   - Line without area; `sampling: 'lttb'`, `showSymbol: false`, `connectNulls: false`, `animation: false`.
3. Add `src/ui/charts/speedOption.test.ts`: speed values in km/h; pace values in min/km with `inverse: true` and `max: 20`; stopped points are 0 (speed) / `null` (pace); time-mode break for `bike.gpx`; tooltip text for each metric and mode.

## 4. Controls and speed chart
1. Create `src/ui/charts/SegmentedControl.tsx` + CSS module: `<fieldset>` with `<legend>`, native radios styled as buttons, disabled options with a `title` hint, ≥ 44 px targets.
2. Create `src/ui/charts/SpeedChart.tsx` + CSS module: region "Speed chart"; header with heading (Speed/Pace) and the Speed/Pace `SegmentedControl` (local state, default `'speed'`); empty state when `getAvailableFields(track).time` is false; otherwise `useECharts` + `setOption(buildSpeedOption(...), { notMerge: true })` on `[chart, track, metrics, mode, metric]`.
3. Pass `mode` to `ElevationChart` and include it in its effect dependencies.

## 5. Charts panel
1. Create `src/ui/charts/ChartsPanel.tsx`: `useState<XAxisMode>('distance')`; effective mode = `'distance'` when the track has no time; renders the X-axis `SegmentedControl` ("Time" disabled without time), `ElevationChart`, `SpeedChart`.
2. Export `ChartsPanel` from `src/ui/charts/index.ts`; in `App.tsx` render `<ChartsPanel track={loaded.track} metrics={metrics} />` instead of `ElevationChart`.

## 6. Component tests (Vitest, mocked ECharts)
1. Add `src/ui/charts/SegmentedControl.test.tsx`: renders legend and options, calls `onChange` on click and arrow keys, disabled option can't be selected.
2. Add `src/ui/charts/SpeedChart.test.tsx`: `run.gpx` → chart created, Speed selected; choose "Pace" → `setOption` called with an inverted y-axis and the heading reads "Pace"; `no-ele-time.gpx` → empty state, no chart instance.
3. Add `src/ui/charts/ChartsPanel.test.tsx`:
   - Default Distance; choosing Time calls `setOption` on both charts with the time axis.
   - `no-ele-time.gpx` → Time disabled, Distance checked.
   - Time selected, rerender with `no-ele-time.gpx` → charts use distance; rerender with `bike.gpx` → Time active again.
   - Rerender with another track keeps the Pace choice and both chart instances.
4. Extend `src/ui/App.test.tsx`: after upload, the "X axis" group and the "Speed chart" region are present.

## 7. Playwright
1. Add `e2e/speed-chart.spec.ts` (shared OSM tile stub):
   - Upload `run.gpx` → regions "Elevation chart" and "Speed chart" each have a canvas; hovering the speed chart shows "km/h" in the tooltip.
   - Choose "Pace" → tooltip shows "/km"; heading reads "Pace".
   - Choose "Time" → hovering either chart shows an elapsed time (`/\d+:\d{2}/`) in the tooltip.
   - Upload `no-ele-time.gpx` → "Time" radio disabled, both empty states visible.
2. Keyboard: Tab to the X-axis group, arrow key changes the selection.

## 8. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` (see `validation.md`), especially the segment break on the time axis with sampling on (see the risk in `requirements.md`).
3. Walk through `validation.md`.
4. Tick the Phase 8 checkboxes in `specs/roadmap.md`.
