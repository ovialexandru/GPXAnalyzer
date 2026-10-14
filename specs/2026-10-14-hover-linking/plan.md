# Plan – Phase 10: Hover linking

Goal: map and charts share a cursor (see `specs/roadmap.md`, Phase 10). API and behavior in `requirements.md`.

## 0. Branch
1. Work on branch `2026-10-14-hover-linking`; rebase onto `main` first if `main` moved since the spec commit.

## 1. View store
1. Create `src/ui/view/viewStore.ts` with `createViewStore()`. `setHover` stores the value right away and schedules one `requestAnimationFrame` notification. Further calls in the same frame only replace the value, and a call that doesn't change the value schedules nothing.
2. Create `src/ui/view/ViewStoreContext.tsx` with `ViewStoreProvider`, `useViewStore`, `useViewState(selector)` (via `useSyncExternalStore`), and `src/ui/view/index.ts`.
3. In `App`, wrap the summary, map and charts in `ViewStoreProvider` with `key` set to the loaded track, so each new track gets a fresh store.
4. Add `src/ui/view/viewStore.test.ts` (fake timers / stubbed rAF):
   - Several `setHover` calls in one frame → one notification, last value.
   - Same value again → no notification.
   - `setHover(null)` clears; unsubscribe stops notifications.
   - `useViewState` re-renders only when its slice changes.

## 2. Pure lookups
1. Create `src/metrics/nearest.ts` with `createNearestPointFinder`, and re-export it from `src/metrics/index.ts`.
2. Add `src/metrics/nearest.test.ts`:
   - Exact point → its index. A spot between two points → the closer one.
   - Points far from the equator (lat 60°) → longitude scaled correctly: a point 100 m east beats one 150 m north.
   - Empty track → `null`. Two segments → indices are global.
   - 100 000-point track: 1 000 lookups in under 1 s.
3. Add `pointAtX` and `xOfPoint` to `src/ui/charts/xAxis.ts`, with tests in `xAxis.test.ts`:
   - Distance axis: exact x, between two points, before the first and after the last.
   - Time axis on `bike.gpx`: an x inside the segment break → nearest real point, never `-1`.
   - `xOfPoint` returns `null` on the time axis for a point without time (`no-ele-time.gpx`).

## 3. Charts
1. Extend `src/test/echartsMock.ts`: `dispatchAction` spy, and `on`/`off` keeping handlers so tests can `emit('updateAxisPointer', …)` / `emit('globalout')`.
2. Create `src/ui/charts/useChartHover.ts(chart, source, line, metrics, mode)`:
   - `updateAxisPointer` → `pointAtX` → `setHover({ index, source })`. `globalout` → clear when `source` matches.
   - When the store's hover comes from another source, show the axis pointer at `xOfPoint` without a tooltip (`dispatchAction` with tooltip content suppressed while driven externally). Hide it when the hover is `null` or the point isn't on this axis.
   - Ignore events caused by its own `dispatchAction` calls, so updates don't loop.
3. Use the hook in `ElevationChart` and `SpeedChart` (sources `'elevation'`, `'speed'`). Share the `buildLineData` result between the option and the hook via `useMemo`.
4. Tests (`ElevationChart.test.tsx`, `SpeedChart.test.tsx`, or a new `useChartHover.test.tsx`):
   - Emitting `updateAxisPointer` at an x sets the store hover to the right index and source.
   - A hover from the map or the other chart → `dispatchAction` for the pointer at the right x, with no tooltip.
   - `globalout` clears only the chart's own hover.
   - Charts in their empty state don't subscribe.

## 4. Map
1. Extend `src/test/leafletMock.ts` with `marker`, `divIcon`, `setLatLng`, map `on`/`off` handler capture and `latLngToContainerPoint`.
2. Create `src/ui/map/useMapHover.ts(map, track)`: build the finder once per track. On map `mousemove` and `click`, find the nearest point, check the 15 px screen distance, and set or clear the map's hover. On `mouseout`, clear it.
3. Create `src/ui/map/hoverMarker.ts` (divIcon marker, styles in `TrackMap.module.css`) and `useHoverMarker(map, track)`: subscribe to `hover`, add/move/remove the marker.
4. Use both hooks in `TrackMap`; keep the component under ~200 lines.
5. Tests in `TrackMap.test.tsx`:
   - Store hover → marker added at the point's lat/lon; `null` → removed; a new index → `setLatLng`, not a new marker.
   - Simulated `mousemove` within 15 px → hover `{ index, source: 'map' }`; at 20 px → cleared; `mouseout` → cleared.

## 5. Playwright
1. Create `e2e/hover-linking.spec.ts` using `run.gpx` and `stubExternalRequests`:
   - Hover the elevation chart at 0.25 → `[data-hover-marker]` visible. Hover at 0.75 → the marker moved.
   - Move the mouse off the chart → the marker is gone.
   - Map → chart: hover the chart to place the marker and read its position, move off, then move the mouse onto the map at that position. The marker reappears there, both chart canvases differ from their pre-hover screenshots, and no chart tooltip is visible.
   - Hovering the speed chart moves the marker too, and switching the x-axis to Time keeps the linking working.
   - At a 375 × 667 viewport with touch: a tap on the elevation chart shows the marker, and there is no horizontal page scroll.
   - No unexpected external requests.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual check with `npm run dev` on every file in `GpxFiles/`, on desktop and a real phone (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 10 checkboxes in `specs/roadmap.md`.
