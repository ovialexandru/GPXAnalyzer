# Plan – Phase 11: Chart zoom

Goal: zoom into a section of the charts (see `specs/roadmap.md`, Phase 11). API and behavior in `requirements.md`.

## 0. Branch
1. Work on branch `2026-10-14-chart-zoom`; rebase onto `main` after Phase 10 is merged.

## 1. Store and range helpers
1. Add `PointRange`, `zoom` and `setZoom` to the view store (same coalescing as `setHover`); a whole-track range is normalised to `null`. The store learns the track size from `createViewStore(pointCount)`, which `ViewStoreProvider` gets as a `pointCount` prop from `App`.
2. Add `rangeToX` and `xToRange` to `src/ui/charts/xAxis.ts`.
3. Tests:
   - `viewStore.test.ts`: `setZoom` coalesces; `[0, n - 1]` is stored as `null`; `hover` and `zoom` notify independently (a hover-only subscriber doesn't re-render on zoom).
   - `xAxis.test.ts`: the round trip `xToRange(rangeToX(r))` returns `r` on both axes for `run.gpx`. On `bike.gpx`'s time axis, a window inside the segment break gives `null`, and one spanning it gives the right range. Edges on untimed points snap inward.

## 2. Zoom option
1. Register `DataZoomComponent` in `src/ui/charts/echarts.ts` and add its option type to `ChartOption`.
2. Create `src/ui/charts/zoomOption.ts` with `buildDataZoom(mode, withSlider)`. The `inside` zoom: `zoomOnMouseWheel: true`, `moveOnMouseMove: false`, `moveOnMouseWheel: false`, `filterMode: 'filter'`, `minValueSpan` 0.05 km / 30 s. The `slider` uses the same `filterMode` and span, styled with `chartTheme.ts`.
3. Pass it through `buildLineOption`. Grow the chart height and `GRID.bottom` for the slider chart only.
4. Add `src/ui/charts/zoomOption.test.ts`: distance vs time spans; slider present only when asked; plain drag never pans (`moveOnMouseMove: false`).

## 3. Linking
1. Create `src/ui/charts/useChartZoom.ts(chart, line, metrics, mode)`:
   - On `datazoom`, read the window from the event (percent of the axis extent `[0, max]`, which `buildXAxis` fixes) and call `setZoom(xToRange(…))`. (Not `chart.getOption()`: it deep-copies the whole option, series data included, on every wheel step.) A window over the whole axis gives `null`; one with no point inside (within a pause) takes the points nearest its edges.
   - When the store's `zoom` differs from the chart's window, `dispatchAction({ type: 'dataZoom', startValue, endValue })`. `null` dispatches `start: 0, end: 100`.
   - Ignore `datazoom` events caused by its own dispatch.
   - Re-apply the window after each `setOption({ notMerge: true })`: x-axis toggle, pace/speed switch.
2. Use the hook in both charts. `ChartsPanel` decides which chart gets the slider: the last one with data.
3. In `useChartHover`, hide the pointer when the hovered point is outside the visible range.
4. Tests:
   - Emitting `datazoom` on one chart → the store holds the range, and the other chart gets a `dataZoom` dispatch with matching values.
   - The x-axis toggle keeps the point range (dispatch values in the new units).
   - The slider is on the speed chart for `run.gpx` and on the elevation chart when the speed chart is empty.

## 4. Toolbar and reset
1. Create `src/ui/charts/ChartToolbar.tsx` (+ CSS module) holding the X-axis `SegmentedControl` and a "Reset zoom" button: 44 × 44 px minimum, disabled while `zoom` is `null`. The row wraps on narrow screens.
2. Use it in `ChartsPanel` (keep the component under ~200 lines).
3. Tests in `ChartsPanel.test.tsx`: Reset is disabled initially; enabled after a store zoom; clicking it sets `zoom` to `null` and disables it again.

## 5. Playwright
1. Create `e2e/chart-zoom.spec.ts` with `run.gpx`:
   - Record the tooltip distance at hover 0.9 on the elevation chart. Wheel-zoom in at the chart's centre, and "Reset zoom" becomes enabled. Hovering at 0.9 on both charts now shows a smaller distance than before, the same on each.
   - Plain drag across the plot area doesn't change the tooltip values (no pan).
   - Dragging the slider window right raises the distance at hover 0.1.
   - Switching to the Time axis keeps the zoom: the time at hover 0.1 and 0.9 lies inside the zoomed section's times.
   - "Reset zoom" restores the original value at 0.9 and disables itself.
   - At 375 × 667: the toolbar wraps without horizontal page scroll, and Reset is at least 44 × 44 px.
   - No unexpected external requests.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/`, on desktop and a real phone (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 11 checkboxes in `specs/roadmap.md`.
