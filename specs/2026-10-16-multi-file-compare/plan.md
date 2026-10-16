# Plan – Multi-file compare

Goal: compare two tracks, A and B. Both are drawn on the map and overlaid on every chart with a legend, linked by distance/time, with a side-by-side stats table (see `specs/roadmap.md`, Post-MVP "Multi-file compare"). Details and decisions are in `requirements.md`. Single-track mode must look and behave exactly as today after every group.

## 1. Fixture and alignment math
1. Add `src/test/fixtures/run-b.gpx`, a "second run" of the `run.gpx` route:
   - only the first 130 of its 150 points, so B is shorter;
   - each point offset by about 3 m, so the two lines don't overlap exactly;
   - timestamps stretched by 10%, so B is slower;
   - HR shifted by +5 bpm, and no cadence, to cover a field only A has;
   - track name "Run B fixture".

   Generate it with a small script kept out of the repo. Document the file in `src/test/fixtures/README.md`, add `RUN_B_GPX` to `e2e/helpers.ts`, and add a fixture test (point count, fields, name).
2. Add `src/ui/compare/trackIds.ts`: `TrackId = 'a' | 'b'`, labels "A"/"B", and colors read from the new `COMPARE_COLORS` in `src/settings.ts`. Extend `settings.test.ts`: valid `#rrggbb`, and A ≠ B.
3. Add `src/ui/compare/alignment.ts` (pure, no React or Leaflet):
   - `alignedPoint(from, index, to, mode, units)` maps a point to the nearest point on the other track at the same position, or null;
   - `alignedRange(from, range, to, mode, units)` returns the aligned range, clipped to the other track, or null below 2 points;
   - `rangeOwner(a, b, mode)` returns the track that is longer on the axis (A on a tie).

   Build them on `xOfPoint` / `pointAtX` / `xToRange` from `xAxis.ts`.
4. Unit tests:
   - identity when A = B;
   - B shorter: positions past its end give null, and ranges are clipped;
   - the time axis with an untimed track gives null;
   - segment gaps;
   - a range that ends up under 2 points gives null;
   - a 50 000-point synthetic pair where 10 000 aligned lookups stay fast (binary search, no linear scans).

## 2. State: tracks and tagged view store
1. `useGpxUpload`: replace `loaded` with `tracks: LoadedTrack[]` and add `compareWith(file)` and `removeTrack(id)`. Implement the loading and error rules from `requirements.md`: start over, the 2-file limit with its notice, a bad file keeps the loaded tracks, one bad file out of two, and latest request wins. Unit-test each rule.
2. `viewStore.ts`: `Hover`, `zoom` and `selection` carry `track: TrackId`. Update `createViewStore`'s normalisation (the whole-track zoom check uses that track's point count; `ViewStoreProvider` takes the point counts per id) and its tests.
3. Update every store reader and writer (chart hooks, map hooks, `useDisplayedStats`, `TrackSummary`) to pass `'a'` in single-track mode. Existing tests should pass with only the `track: 'a'` additions.
4. `App`: build the track entries `{ id, loaded, metrics }` (metrics memoized per `LoadedTrack`), reset the view store when the pair changes, and still render single-track mode for one entry. Update the `App.test.tsx` notice test to the new 3-file notice.

## 3. Loading UI and chips
1. `FileDropZone`: add a "Compare with…" button (its own hidden single-file input) when a track is loaded. It calls `compareWith`. The drop zone and "Choose file" keep their start-over behaviour, with `multiple` on the input.
2. Add `src/ui/compare/TrackChips.tsx`: swatch, letter, name, and a × button labelled "Remove <name>". It is shown only in compare mode, at the top of the summary area.
3. Component tests:
   - Compare adds B, and Compare again replaces B;
   - dropping 2 files loads both, and dropping 3 shows the notice;
   - removing B returns to single-track mode, and removing A promotes B;
   - a bad B keeps A.

## 4. Map overlay
1. `TrackMap` takes a list of entries. Draw B's lines, then A's, then all start/finish markers, in the track colors. Fit to the union bounds on load and when B is added or removed. "Fit to track" also uses the union.
2. `useMapHover`: one nearest-point finder per track, and the closer hit within tolerance sets `{ track, index }`.
3. `useHoverMarker`: one marker per track, colored, at the hovered point or the aligned point, and hidden when there is none.
4. `useSelectionOverlay`: in compare mode, dim both tracks and draw each track's own range in its own color, with the `track-selection` class.
5. `TrackColorToggle`: disable Speed with the compare hint, and keep the saved choice. Hide the legend.
6. Component tests (Leaflet mock): two line sets with the right colors; union fit; hover on B moves both markers; selection draws both highlights; Speed disabled in compare and restored after removing B.
7. Check by hand with two large files from `GpxFiles/`: panning, hover and selection stay smooth.

## 5. Chart overlay and legend
1. Generalise `buildLineOption` (and the speed, elevation and sensor option builders) to take series inputs `{ id, track, metrics, color, name }`:
   - one series per input that has the data;
   - x-axis extent from the longest input;
   - no area fill in compare mode;
   - in compare mode only: a non-clickable legend and the per-track tooltip lines.

   Single-track options must stay equal to today's: assert this in the existing option tests.
2. `ChartsPanel`: pass both tracks. The time axis needs both tracks to have time (disable it with the hint otherwise). The HR and cadence charts show when either track has the data. The Speed empty state shows only when neither has time.
3. `useChartHover`, `useChartZoom` and `useChartBrush`:
   - a chart pointer sets the hover on the owner track's point at that x;
   - a hover or range from the other track is drawn through `alignment.ts`;
   - zoom and brush ranges are stored on `rangeOwner`.
4. Unit tests: option snapshots of key fields for 1 and 2 inputs; legend and tooltip text; the time axis disabled with an untimed B; hover, zoom and brush round-trips across tracks, including a range past B's end.

## 6. Stats table
1. Add `src/ui/compare/CompareStats.tsx`, a `<table>` named "Track comparison" / "Selection comparison":
   - swatch headers, and the same rows and formatters as `TrackSummary` (extract the shared row list into one module rather than duplicating it);
   - "–" for missing values, and "Not in selection" for a track with no aligned range;
   - an "Available data" row, and the selection line with "Show whole track".
2. A per-track selection hook (like `useDisplayedStats`) computes each track's range stats from the stored selection and alignment.
3. Wrap the table in a horizontally scrolling card (CSS only). Check it at 360 px: the page doesn't scroll sideways, and controls are tap-sized.
4. Component tests: values for A and B, units switch, selection updates both columns live, B with no range, and rows hidden when neither track has the value.

## 7. Tests
1. E2E `e2e/compare.spec.ts`, with `run.gpx` + `run-b.gpx` loaded through the file input:
   - Chips A and B appear. The map canvas has stroke pixels in both `COMPARE_COLORS` (pixel sampling, as in `speed-colors.spec.ts`). After removing B, only A's color remains.
   - Each chart shows a legend with both names, and the tooltip lists A and B.
   - Hover on the Speed chart shows two hover markers on the map. Hovering past B's end shows only A's marker.
   - Zoom and a brush selection apply to all charts. Both tracks show `track-selection` paths. The table switches to "Selection comparison" and both columns change. A selection past B's end shows "Not in selection" for B.
   - The time axis works with both tracks. With `run.gpx` + `no-ele-time.gpx`, it is disabled with the hint.
   - Track color Speed is disabled while comparing and comes back after removing B.
   - Dropping 3 files shows the notice. A bad B keeps A.
   - Removing A promotes B.
   - Phone viewport: chips, Compare button and table fit, and the page doesn't scroll sideways.
   - No console errors and no external requests.
2. Run the full gate (lint, format, typecheck, unit, e2e, e2e repeat, prod e2e) and fix every failure. Never retry flaky tests away.

## 8. Docs
1. README: describe comparing two tracks (Compare with…, chips, linked by distance/time, stats table) and mention `COMPARE_COLORS` in `src/settings.ts`.
2. Tick the "Multi-file compare" boxes in `specs/roadmap.md`. Note there that it is limited to two tracks (A vs B).
3. Record the findings in `requirements.md`: the fixture, performance numbers with two large tracks, and anything surprising.
