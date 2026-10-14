# Validation – Phase 12: Range selection

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-range-selection`, rebased on `main` with Phases 10–11 merged.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–11.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests
- [ ] `setSelection` coalesces per frame and turns ranges of fewer than 2 points into `null`.
- [ ] Brushing one chart sets the store and mirrors the brush on the other chart, with no feedback loop.
- [ ] The brush is redrawn in the right units after the x-axis toggle and the speed/pace switch.
- [ ] `createSelectionLayers`: inclusive ends, one polyline per segment part, class `track-selection`.
- [ ] The map overlay is added and removed with the selection, and the base track is dimmed and restored. `fitBounds` is not called on selection.
- [ ] "Zoom to selection" sets `zoom` to the selection. "Clear selection" and Esc clear it; Esc in an input doesn't.

## Performance
- [ ] Manual: on a 100 000-point synthetic GPX, dragging a brush across most of the track keeps the brush band and the map highlight following the cursor with no visible lag (at most one store update per frame).
- [ ] Hover and zoom from Phases 10–11 are as responsive as before.

## E2E (`e2e/range-selection.spec.ts`)
- [ ] Drag on a chart → `path.track-selection` on the map; the map viewport is unchanged.
- [ ] "Zoom to selection" fits the charts to the brushed range.
- [ ] "Clear selection" and Esc remove the highlight and disable the selection buttons.
- [ ] Brushing works on both charts; a time-axis brush across `bike.gpx`'s pause gives 2 highlight paths.
- [ ] 375 × 667 with touch: a one-finger drag selects; no horizontal page scroll; buttons at least 44 × 44 px.

## Manual – desktop and real phone (`npm run dev`)
- [ ] Desktop, every file in `GpxFiles/`: brushing either chart shows the same band on both and highlights exactly that stretch on the map. The rest of the track is visibly dimmed, and start/finish stay clear.
- [ ] Brushing while zoomed, then "Reset zoom": the brush is still there, at the right place.
- [ ] Switching Distance ↔ Time keeps the selection on the same stretch of track.
- [ ] A click on a chart without dragging clears the selection.
- [ ] Real phone: a one-finger drag across a chart selects, pinch still zooms, and the buttons are easy to tap.
- [ ] Loading a second file clears the selection; a bad file leaves it unchanged.

## Design
- [ ] The selection is stored as a point-index range only; brush coordinates never enter the store.
- [ ] Selection linking goes through the view store, like hover and zoom.
- [ ] Only `BrushComponent` (and, if needed, a hidden `ToolboxComponent`) was added to the ECharts registrations.
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 12 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 5–11 validations still hold.
- [ ] Existing `specs/` files are unchanged except for the roadmap.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
