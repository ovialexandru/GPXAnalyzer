# Plan – Phase 12: Range selection

Goal: select a segment on a chart and see it on the map (see `specs/roadmap.md`, Phase 12). API and behavior in `requirements.md`.

## 0. Branch
1. Work on branch `2026-10-14-range-selection`; rebase onto `main` after Phase 11 is merged.

## 1. Store
1. Add `selection` and `setSelection` to the view store (same coalescing). Ranges of fewer than 2 points become `null`.
2. Tests in `viewStore.test.ts`: coalescing; the 1-point range → `null`; `selection` notifies independently of `hover` and `zoom`.

## 2. Brush on the charts
1. Register `BrushComponent` (and a hidden `ToolboxComponent` only if needed) in `src/ui/charts/echarts.ts`; extend `ChartOption`.
2. Create `src/ui/charts/brushOption.ts` with `buildBrush()` (lineX, single, amber band, `xAxisIndex: 0`); pass it through `buildLineOption`. Add `brushOption.test.ts`.
3. Create `src/ui/charts/useChartBrush.ts(chart, line, metrics, mode)`:
   - After each `setOption`, activate drag-to-brush with `dispatchAction({ type: 'takeGlobalCursor', key: 'brush', brushOption: { brushType: 'lineX', brushMode: 'single' } })`.
   - On `brush` events, `coordRange` → `xToRange` → `setSelection`. Empty areas → `null`.
   - When the store's `selection` differs from the chart's brush, draw it with `dispatchAction({ type: 'brush', areas: [{ brushType: 'lineX', xAxisIndex: 0, coordRange: rangeToX(…) }] })`, or clear it with `areas: []`.
   - Ignore `brush` events caused by its own dispatch.
   - Redraw after the x-axis toggle and the speed/pace switch.
4. Use the hook in both charts. Check that hover (Phase 10) and wheel/slider zoom (Phase 11) still work with brush active.
5. Tests (mock `emit('brush', …)`):
   - Brushing one chart sets the store and dispatches the same range to the other.
   - A tiny brush clears the selection.
   - The x-axis toggle redraws the brush in time units.
   - A store clear removes both brushes.

## 3. Map highlight
1. Create `src/ui/map/selectionLayers.ts` with `createSelectionLayers(track, range)`: split the range by segments, `L.polyline` on a shared `L.svg()` renderer, `className: 'track-selection'`, `#ea580c`, weight 5, non-interactive.
2. Create `src/ui/map/useSelectionOverlay.ts(map, track, baseLayers)`: subscribe to `selection`, then swap the overlay and set the base polylines' opacity to 0.35, or 1 when there is no selection. Start/finish markers stay unchanged. Never call `fitBounds`.
3. Use it in `TrackMap`; extend `leafletMock.ts` (`svg`, `setStyle`) as needed.
4. Tests:
   - `selectionLayers.test.ts`: a range inside one segment → 1 polyline with exactly those points. A range spanning `bike.gpx`'s index 100 → 2 polylines. Range ends are inclusive.
   - `TrackMap.test.tsx`: a store selection adds the overlay and dims the base; clearing removes it and restores opacity; `fitBounds` is not called again.

## 4. Toolbar actions
1. Add "Zoom to selection" (`setZoom(selection)`) and "Clear selection" (`setSelection(null)`) to `ChartToolbar`, both disabled without a selection and at least 44 × 44 px.
2. Add an Esc keydown listener while a selection exists (ignored when focus is in an input or textarea).
3. Tests in `ChartsPanel.test.tsx`: buttons are disabled with no selection and enabled with one. Zoom to selection sets `zoom` to the selection. Clear and Esc reset `selection`, and Esc inside an input does nothing.

## 5. Playwright
1. Create `e2e/range-selection.spec.ts` with `run.gpx`:
   - Drag across the elevation chart from 0.3 to 0.6 of its width → `path.track-selection` appears on the map, and "Clear selection" and "Zoom to selection" become enabled.
   - The map viewport is unchanged: the tile pane transform is the same before and after.
   - "Zoom to selection" → the tooltip distances at hover 0.05 and 0.95 lie inside the brushed range (compared with the tooltips at 0.3 / 0.6 before zooming).
   - "Clear selection" → no `path.track-selection` and buttons disabled. Brushing again and pressing Esc clears too.
   - Brushing on the speed chart also selects. With `bike.gpx` on the Time axis, a brush across the pause gives 2 `path.track-selection` elements.
   - At 375 × 667 with touch: a one-finger drag across a chart creates a selection, the toolbar wraps, and there's no horizontal page scroll.
   - No unexpected external requests.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/`, on desktop and a real phone (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 12 checkboxes in `specs/roadmap.md`.
