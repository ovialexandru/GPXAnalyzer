# Validation – Phase 8: Speed/pace chart and axis toggle

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-metrics-and-charts` at the Phase 8 commit.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–7.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – helpers and options
- [ ] `formatSpeed` / `formatPace` give "12.3 km/h" / "5:12 /km" and never "x:60".
- [ ] Distance mode: one data item per point, identity `dataToPoint`, no breaks.
- [ ] Time mode: x from 0 to the duration; `bike.gpx` has exactly one `null` break, mapped to `-1`; all other items map to the right point.
- [ ] `niceTimeInterval` returns the listed intervals (644 s → 2 min, 2523 s → 10 min, 7731 s → 30 min).
- [ ] Speed option in km/h from 0; pace option in min/km, inverted, capped at 20.
- [ ] Stopped points: speed 0, pace `null`, `connectNulls` false.
- [ ] Both options keep `sampling: 'lttb'`, `animation: false`, `showSymbol: false`.

## Component tests – mocked ECharts
- [ ] Default x-axis is Distance; Time updates both charts.
- [ ] Track without time: Time disabled, speed empty state, no speed chart instance.
- [ ] Time choice survives a track without time and applies again to the next timed track.
- [ ] Speed/Pace switch changes the option and the heading; the choice is kept across tracks.
- [ ] Loading another track keeps the same chart instances.
- [ ] `SegmentedControl` works by click and arrow keys; disabled options can't be chosen.

## E2E – Playwright
- [ ] `run.gpx` shows canvases in both "Elevation chart" and "Speed chart".
- [ ] Speed tooltip shows "km/h"; after choosing Pace it shows "/km".
- [ ] After choosing Time, tooltips show an elapsed time on both charts.
- [ ] `no-ele-time.gpx`: Time disabled, both empty states visible.
- [ ] The X-axis toggle is usable with the keyboard.

## Manual – desktop browser (`npm run dev`)
- [ ] For each file in `GpxFiles/`, the speed line is plausible for the sport (run ~8–12 km/h, bike ~15–35 km/h, kayak ~6–10 km/h) and not dominated by GPS spikes.
- [ ] Pace view: faster is up; stops appear as gaps; a walk break doesn't flatten the running pace line.
- [ ] Time axis ends at the summary's Duration; labels are round (e.g. every 10 or 30 min).
- [ ] `bike.gpx` on the time axis shows a visible break across the 177 s pause in both charts; on the distance axis the lines are continuous.
- [ ] The break is still visible on the largest file in `GpxFiles/` if it has segments, or on a synthetic multi-segment file with > 10 000 points (LTTB risk in `requirements.md`).
- [ ] Toggles are easy to hit (≥ 44 px) and clearly show the selected option.
- [ ] **Large-track performance:** with the largest file in `GpxFiles/`, switching Distance/Time and Speed/Pace redraws without a noticeable freeze.

## Design
- [ ] One global x-axis state in `ChartsPanel`; no global store added.
- [ ] Option builders and `xAxis.ts` are pure; display-unit conversion happens there, metrics stay SI.
- [ ] `dataToPoint` maps every data item to its point index (or `-1` for breaks), ready for Phase 10.
- [ ] The toggles are native radio inputs in a `<fieldset>` with a `<legend>`.
- [ ] Styles use CSS modules; colours and sizes in `chartTheme.ts`.
- [ ] No new dependencies; no module over ~200 lines.
- [ ] The GPX file never leaves the browser; no new external requests.

## Merge gate
- [ ] All Phase 8 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 6 and 7 validations still hold.
- [ ] Existing `specs/` files are unchanged except for the roadmap checkboxes.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
