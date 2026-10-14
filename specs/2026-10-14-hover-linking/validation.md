# Validation – Phase 10: Hover linking

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-14-hover-linking`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including all existing tests from Phases 1–9.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests (OSM tiles stubbed).
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests
- [ ] View store: several `setHover` calls in one frame give one notification with the last value; an unchanged value gives none.
- [ ] `useViewState` re-renders a component only when its selected slice changes.
- [ ] Nearest point: exact, in-between and high-latitude cases are correct; an empty track gives `null`; indices are global across segments.
- [ ] `pointAtX` never returns a break item (`-1`) on the time axis; `xOfPoint` is `null` for an untimed point on the time axis.
- [ ] Chart hook: its own hover sets `{ index, source }`; a foreign hover dispatches the pointer with no tooltip; `globalout` clears only its own hover; no feedback loop (dispatching doesn't set the store again).
- [ ] Map hook: within 15 px sets the map hover, beyond it or on `mouseout` clears it; the marker is created once and moved with `setLatLng`.

## Performance
- [ ] 100 000-point synthetic track: 1 000 nearest-point lookups take under 1 s in total (unit test).
- [ ] The store notifies at most once per animation frame (unit test), so map hover on a 100 000-point track does at most one scan per frame.
- [ ] Manual: on the largest `GpxFiles/` track and a 100 000-point synthetic GPX loaded in the dev server, the marker follows the cursor with no visible lag in either direction (chart→map, map→chart).

## E2E (`e2e/hover-linking.spec.ts`)
- [ ] Hovering the elevation chart shows `[data-hover-marker]` on the map, and it moves when the cursor moves along the chart.
- [ ] Leaving the chart removes the marker.
- [ ] Hovering the track on the map shows the marker and redraws both charts (axis pointer), with no chart tooltip.
- [ ] Hovering the speed chart moves the same marker, on both the Distance and Time axes.
- [ ] At 375 × 667 with touch emulation, tapping a chart shows the marker, and the page has no horizontal scroll.

## Manual – desktop and real phone (`npm run dev`)
- [ ] Desktop, every file in `GpxFiles/`: chart→map and map→chart linking both work. The tooltip appears only on the hovered chart, and the other chart shows just the pointer line.
- [ ] Time axis: hovering a point across the bike fixture's pause behaves sensibly (snaps to a real point).
- [ ] `no-ele-time.gpx`: hovering the map shows the marker with no errors in the console (both charts are in their empty states).
- [ ] Real phone: tapping or dragging on a chart moves the marker, and tapping the track on the map places it. Page scrolling still works outside the charts.
- [ ] Loading a second file clears the marker; a bad file leaves the current track and linking unchanged.

## Design
- [ ] `src/metrics/nearest.ts` is pure and has no UI imports (lint enforces it).
- [ ] Views refer to points by index only; no lat/lon or x values are stored in the view store.
- [ ] Hovering doesn't re-render `App`, `TrackSummary` or `ChartsPanel` (React DevTools profiler, or a render-count test).
- [ ] No new dependencies; no module over ~200 lines.

## Merge gate
- [ ] All Phase 10 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 5–9 validations still hold.
- [ ] Existing `specs/` files are unchanged except for the roadmap.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
