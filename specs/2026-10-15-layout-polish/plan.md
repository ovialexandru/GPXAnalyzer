# Plan – Phase 15: Layout and polish

Goal: usable on desktop and mobile (see `specs/roadmap.md`, Phase 15). Decisions and API in `requirements.md`.

## 1. Units model and formatting
1. Create `src/ui/units/units.ts` (`Units`, constants, `distanceUnitMeters`, `loadUnits`, `saveUnits`) with tests: default, round trip, invalid value, storage that throws.
2. Add the optional `units` to `formatDistance`, `formatElevation`, `formatSpeed`, `formatPace`; tests for imperial ("850 ft", "2.52 mi", "72 ft", "12.3 mph", "8:22 /mi") while all metric tests pass unchanged.
3. Create `UnitsProvider`, `useUnits`, `UnitsToggle` in `src/ui/units/`; move `SegmentedControl` (+ CSS, test) to `src/ui/common/`.

## 2. Units in the views
1. `xAxis.ts`: `units` on `buildLineData`, `xOfPoint`, `rangeToX`, `axisExtent`, `buildXAxis` ("mi" labels), `formatX`. Tests: imperial x values in miles, axis max = total miles, tooltip "1.23 mi".
2. Option builders: elevation ys in ft, speed in mph, pace in min/mi with the 30 min/mi cap; `buildLineOption` passes `units` to the x-axis. Tests per builder.
3. Hooks `useChartZoom`, `useChartBrush`, `useChartHover` take `units` (effects depend on it). Charts read `useUnits()`.
4. `TrackSummary` formats with the units; `TrackMap` shows an imperial or metric scale bar and swaps it on change.
5. App: `UnitsProvider` around the page, `UnitsToggle` in a `<header>` with the title.
6. Tests: switching units in `App.test.tsx` changes the summary ("0.91 mi"), keeps a store selection and zoom; persisted value used on the next render.

## 3. Touch: page scrolling over the map and charts
1. `useLeafletMap`: `dragging: !coarsePointer` (from `matchMedia('(pointer: coarse)')`); `TrackMap` renders the caption, shown by a `(pointer: coarse)` media query.
2. `useChartBrush`: generalise the pinch path to a suspended gesture (`'pinch' | 'scroll'`). On a one-finger touchstart (capture) remember the start and make `preventDefault` a no-op; on touchmove decide after 10 px: vertical → scroll (brush off, keep `preventDefault` a no-op), horizontal → brush (restore `preventDefault`). On release, as for a pinch, the brush comes back on and the selection from before the touch is restored.
3. `ChartCard`: `touch-action: pan-y` on the chart container.
4. Leaflet zoom buttons 44 × 44 px (`TrackMap.module.css`).
5. Unit tests (`useChartBrush.test.tsx`): a vertical swipe switches the brush off and restores the selection; a horizontal drag keeps brushing; the patched `preventDefault` doesn't cancel. `TrackMap.test.tsx`: `dragging` follows the pointer media query.

## 4. Empty, loading and error states; layout
1. `public/sample.gpx` (copy of `src/test/fixtures/run.gpx`), `loadSample()`.
2. `useGpxUpload`: `loadingName`, `error.fileName`, `dismissError()`.
3. `App`: intro panel with "Try a sample track" before the first track; loading status with spinner; error alert with title and Dismiss; compact `FileDropZone` after a track is loaded; drop zone and sample button disabled while loading.
4. CSS: column 48 rem / 64 rem ≥ 1024 px; map `clamp(280px, 55vh, 600px)`; header row; compact drop zone.
5. Tests (`App.test.tsx`, `FileDropZone.test.tsx`, `useGpxUpload`): intro visible only before the first track; sample loads "Run fixture"; loading text with the name and disabled controls; error title, Dismiss, track kept; compact zone after load.

## 5. Playwright
1. Create `e2e/mobile.spec.ts` (375 × 667, touch):
   - Empty, error, loaded and selection states: no horizontal page scroll.
   - Loaded: every visible button and radio label (except Leaflet attribution links) is at least 44 × 44 px.
   - One-finger vertical swipe over the map and over a chart scrolls the page and selects nothing; a horizontal drag on a chart still selects.
   - Pinch on the map changes its zoom.
   - The touch caption is visible.
2. Create `e2e/units.spec.ts` (desktop): switching to Imperial changes the summary, tooltips ("mi") and the scale bar; reload keeps Imperial.
3. Create `e2e/states.spec.ts` (desktop): intro and sample button; sample loads; error alert with Dismiss; compact drop zone.
4. Update specs that rely on the map height or old texts.

## 6. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual: desktop and a real phone (see `validation.md`).
3. Tick the Phase 15 checkboxes in `specs/roadmap.md`.
