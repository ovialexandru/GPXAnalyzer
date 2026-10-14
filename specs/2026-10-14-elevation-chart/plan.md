# Plan – Phase 7: Elevation chart

Goal: first chart (see `specs/roadmap.md`, Phase 7). API and behavior in `requirements.md`.

## 1. Dependencies and lint
1. `npm i echarts` (types are bundled).
2. In `eslint.config.js`, add `'echarts'` and `'echarts/**'` to the restricted-import group for `model`/`parser`/`metrics`.

## 2. ECharts setup and hook
1. Create `src/ui/charts/echarts.ts`: `echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer])`, export `echarts` and the `ChartOption` type.
2. Create `src/ui/charts/useECharts.ts`: callback ref with cleanup (React 19), `echarts.init(node, undefined, { renderer: 'canvas' })`, a `ResizeObserver` calling `chart.resize()`, and cleanup that disconnects the observer and calls `chart.dispose()`; return `{ containerRef, chart }`.
3. Create `src/ui/charts/chartTheme.ts` with colours, grid padding, font size and chart height.

## 3. Option builder
1. Create `src/ui/charts/elevationOption.ts` with `buildElevationOption(track, metrics)`: data `[distance / 1000, ele ?? null]` per point; area line with `sampling: 'lttb'`, `showSymbol: false`, `connectNulls: false`, `animation: false`; axes and tooltip as in `requirements.md`.
2. Add `src/ui/charts/elevationOption.test.ts`:
   - `run.gpx` → one series with 150 data pairs; first x is 0, last x ≈ 1.469; y equals each point's `ele`.
   - x-axis `min: 0`, `max` ≈ total km; y-axis `scale: true`.
   - A point without `ele` becomes `null`; `connectNulls` is false.
   - `sampling: 'lttb'`, `animation: false`, `showSymbol: false`.
   - Tooltip formatter returns "1.23 km · 245 m" style text for a given param.

## 4. ElevationChart component
1. Create `src/ui/charts/ElevationChart.tsx` + `ElevationChart.module.css`: region "Elevation chart" with heading "Elevation".
2. If `getAvailableFields(track).ele` is false (memoised), render the empty-state card; otherwise render the container and, in an effect on `[chart, track, metrics]`, call `chart.setOption(buildElevationOption(track, metrics), { notMerge: true })`.
3. Add `src/ui/charts/index.ts` re-exporting `ElevationChart`.
4. In `App.tsx`, render `<ElevationChart track={loaded.track} metrics={metrics} />` after `TrackMap`.

## 5. Component tests (Vitest, mocked ECharts)
1. Add `src/test/echartsMock.ts` (like `leafletMock.ts`): `init` returns spies for `setOption`, `resize`, `dispose`, `on`, `off`; `use` is a no-op; plus a `ResizeObserver` stub that records `observe`/`disconnect` and can trigger a callback.
2. Add `src/ui/charts/ElevationChart.test.tsx`:
   - `run.gpx` → `init` called once, `setOption` called with 150 data pairs and `notMerge: true`.
   - Rerender with `bike.gpx` → same instance, `setOption` called again with 200 pairs; `init` still once.
   - `no-ele-time.gpx` → no `init`; text "This track has no elevation data." in region "Elevation chart".
   - Switching `run.gpx` → `no-ele-time.gpx` → `dispose` called and empty state shown; back to `run.gpx` → new `init`.
   - Triggering the ResizeObserver callback → `resize` called.
   - Unmount → `dispose` called and observer disconnected.
3. Extend `src/ui/App.test.tsx`: region "Elevation chart" appears only after a successful upload.

## 6. Playwright
1. Add `e2e/elevation-chart.spec.ts` (reuse the OSM tile stub from `e2e/map.spec.ts`; move it to a shared helper `e2e/tiles.ts` if both need it).
2. Upload `run.gpx` → region "Elevation chart" visible with a `canvas` inside, non-zero size.
3. Hover the middle of the canvas → tooltip text matches `/\d+(\.\d+)? (k)?m · \d+ m/`.
4. Upload `no-ele-time.gpx` → empty-state text visible, no canvas in the region.
5. Upload `bike.gpx` → canvas back; still exactly one chart canvas container in the region.

## 7. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Check the bundle size reported by `npm run build` (ECharts part should be well under the ~1 MB of full ECharts).
3. Manual desktop check with `npm run dev`, including all files in `GpxFiles/` (see `validation.md`).
4. Walk through `validation.md`.
5. Tick the Phase 7 checkboxes in `specs/roadmap.md`.
