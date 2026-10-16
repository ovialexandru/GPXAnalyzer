# Requirements – Multi-file compare

## Scope
From `specs/roadmap.md`, Post-MVP "Multi-file compare":
- Load several tracks and overlay on map.
- Overlay series on charts with a legend.
- Side-by-side stats.

Today the app shows one track at a time, and dropping another file replaces it. This phase lets the user compare two tracks, **A** and **B**, for example two runs of the same route. Both are drawn on the map and on every chart in their own color. Hover, zoom and selection link the two at the same distance (or elapsed time), and a stats table shows A and B side by side. With one track loaded, the app looks and behaves exactly as it does today.

Decided with the user:
- **A vs B only (max 2 tracks).** The roadmap says "several", but two tracks keep the UI, colors and stats table simple. More than two is out of scope for this phase.
- **Linked by distance/time.** Each track starts at 0 on the chart x-axis (distance or elapsed time, using the existing toggle). Hovering at km 3 shows a marker on both tracks at their own km 3. Selecting km 2–5 gives each track's stats for its own km 2–5.
- **Stats as a table, one column per track.** Rows are the existing summary stats. The table scrolls horizontally inside its card on phones, so the page itself never scrolls sideways.
- **Speed coloring off while comparing.** Each track is drawn in its own color. With two tracks, the "Speed" option of "Track color" is disabled with a hint. Single-track mode is unchanged.
- **Loading:** a "Compare with…" button next to the compact drop zone opens the file picker for B. Dropping or choosing two files at once loads both. Each track has a chip with a × button to remove it.
- **Branch** `2026-10-16-multi-file-compare`, stacked on `2026-10-16-speed-colored-track` (main doesn't have speed colors yet). The PR targets `main` after the speed-colored track PR merges.
- **Tests** use a new "second run" fixture of the same route.

## Out of scope
- More than two tracks, and a track palette beyond A and B.
- Aligning tracks by map position, by clock time or by matching the route. Alignment is always from each track's own start.
- Deltas between A and B in the stats table (e.g. "+0:42"). This could be a later amendment.
- Hiding one track's series from the chart legend (the legend is not clickable).
- Speed-colored lines in compare mode.
- A bundled comparison sample on the empty state ("Try a sample track" still loads one track).
- Saving the pair between visits. Tracks are never stored (mission: private, no saved libraries).

## Loading and removing tracks
- **Drop zone and "Choose file" start over.** One file gives single-track mode, as today. Two files give A (first file) and B (second file). With three or more files, the first two load and a notice says: "Only two files can be compared; loaded first.gpx and second.gpx." This notice replaces the current "Only one file at a time…" notice.
- **"Compare with…"** is shown once a track is loaded. It opens the file picker for a single file:
  - with only A loaded, the file becomes B;
  - with A and B loaded, it replaces B.

  It is a tap-sized button next to "Choose file" in the compact drop zone.
- **Errors:**
  - A bad file never removes a loaded track, and its error names the file, as today.
  - When one of two dropped files fails, the good one loads alone and the error names the bad one.
  - When B fails in "Compare with…", A stays and the app stays in single-track mode.
  - Only the latest request is applied, as today.
- **Chips:** in compare mode, the summary area starts with two chips. Each chip shows a color swatch, the letter A or B, the track name (or file name when the track has no name), and a × button labelled "Remove <name>".
  - Removing B returns to single-track mode with A.
  - Removing A makes B the new A.
  - In both cases the hover, zoom and selection are reset.
- In single-track mode there are no chips. The summary heading is unchanged.

## Colors
- In `src/settings.ts`, a `COMPARE_COLORS` constant `{ a, b }`. Defaults:
  - `a: '#1d4ed8'`, the existing plain track blue;
  - `b: '#ea580c'`, orange. Blue and orange are the usual pair that stays distinct for color-blind users.

  The settings unit test checks they are valid `#rrggbb` colors and differ.
- The map lines, the chart series, the hover markers, the chips and the stats table headers all use these colors. Start and finish markers stay green and red for both tracks.
- In compare mode, the chart series use the track colors instead of each chart's own color, and there is no area fill under the elevation line, because two filled areas would hide each other.

## Map
- Both tracks are drawn: B first, then A on top, both at the plain line weight. The start/finish markers of both tracks are drawn above both lines.
- The map fits both tracks' combined bounds on load and when B is added or removed. "Fit to track" also fits both tracks.
- **Hover:** the cursor (or a tap) picks the nearest point on either track within `HOVER_TOLERANCE_PX`; when both tracks are within range, the closer one wins. Each track then shows its own hover marker, in its track color, at the aligned position (see "Alignment"). A track with no point at that position shows no marker.
- **Selection:** both tracks are dimmed (`DIMMED_OPACITY`). Each track's selected range is drawn above in its own color at full opacity and highlight weight, with the `track-selection` class. Orange would be ambiguous because B is orange.
- **Track color:** in compare mode the "Speed" option is disabled with the hint "Speed colors are off while comparing two tracks." The map draws plain colors, and the legend is hidden. The saved choice is kept and applies again when the app returns to one track.

## Alignment
- A **position** is a value on the current x-axis: distance from the track's start, or elapsed time from its start. This is the same `xOfPoint` value the charts use today.
- The **aligned point** on the other track is its point nearest to that position (`pointAtX` on that track's line data, a binary search).
  - There is no aligned point when the position is past the other track's end, or, on the time axis, when the other track has no timestamps.
  - When a track's first point is ahead of the position, its first point is used.
- **Hover, zoom and selection carry the id of the track their point indices refer to** (`'a'` or `'b'`). Views of the other track convert them through the position. Because indices stay on a real track, they survive a switch between the distance and time axes, as they do today.
- A **zoom or selection made on a chart** is stored on the track that is longer on the current axis (A on a tie), so neither end is cut off. The other track's range is the aligned range, clipped to its own extent. When that range has fewer than 2 points, the track has no range: no highlight, and "–" in the stats.

## Charts
- Every chart shows one series per track that has the data, in the track color. The x-axis runs from 0 to the longer track's extent. Line data, downsampling (`lttb`) and segment breaks are built per track, as today.
- **Legend:** in compare mode each chart shows an ECharts legend with the two track names in their colors, above the plot. It is not clickable (`selectedMode: false`) and not shown in single-track mode.
- **Tooltip** under the cursor: the position, then one line per track, e.g. "1.23 km · A 12.3 km/h · B 11.8 km/h". A track without a value at that position shows "–".
- **Speed/Pace:** both tracks are shown in the chosen metric. The empty state is shown only when neither track has timestamps.
- **Time axis:** available only when both tracks have timestamps. Otherwise the toggle is disabled with the hint "Both tracks need timestamps for the time axis." and the charts use distance. The chosen axis is kept for later, as today.
- **HR and cadence charts:** shown when either track has the data. A track without it simply has no series there.
- Zoom (wheel, drag and slider), brush and Reset behave as today on the shared axis, and are linked across all charts and the map.

## Stats
- In compare mode, the single-track `TrackSummary` is replaced by a comparison table:
  - one column per track, headed by its swatch and letter, with the name as the column header's accessible name;
  - the same rows as the single-track summary (distance, duration, elevation gain, avg/max speed, avg/max HR, avg/max cadence), formatted in the current units;
  - a row is shown when at least one track has a value, and a missing value shows "–".
- With a selection, the heading line reads "Selection · 2.00 – 5.00 km" (in the axis's units, or as elapsed times on the time axis), followed by "Show whole track". Each column shows that track's stats for its own aligned range, computed with the existing `getRangeStats`. A track with no range shows "–" in every row, with the note "Not in selection" under its header.
- Each track's "Available data" badges move into the table, as a last row.
- The table has the accessible name "Track comparison" (and "Selection comparison" while a selection is shown). It is a real `<table>` with `<th scope="col">` and `<th scope="row">` cells. Its card scrolls horizontally on narrow screens, and the page never does.

## Code layout
- `src/ui/upload/useGpxUpload.ts` holds `tracks: LoadedTrack[]` (0–2 tracks) instead of `loaded`, with:
  - `loadFiles(files)` (start over);
  - `compareWith(file)` (add or replace B);
  - `removeTrack(id)`.
- `App` computes metrics per track (memoized per `LoadedTrack`). It renders `TrackSummary` for one track and `CompareStats` for two. The `ViewStoreProvider` reset key is the pair.
- `src/ui/compare/`: `trackIds.ts` (`TrackId = 'a' | 'b'`, colors, labels), `alignment.ts` (pure: aligned point and range between two tracks on an axis), `TrackChips.tsx`, `CompareStats.tsx`, plus tests.
- `src/ui/view/viewStore.ts`: `Hover`, `zoom` and `selection` gain a `track: TrackId` field. In single-track mode it is always `'a'`, and existing behaviour is unchanged.
- Map: `TrackMap` takes a list of `{ id, track, metrics }` entries. Track layers, the selection overlay, the hover marker and map hover run per entry, and the bounds are the union of both tracks.
- Charts: the option builders take a list of series inputs (`{ id, track, metrics, color, name }`). Single-track mode passes one input and must produce the same option as today, apart from what's needed to carry the id. The zoom, brush and hover hooks use the series of the track a range or hover refers to.
- Metrics and parser are unchanged. Alignment lives in the UI layer, because it works on chart axis values.
- No component over ~200 lines. No new npm dependencies.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Number of tracks | Two (A and B) | User choice; keeps colors, chips and the stats table simple |
| Linking | Same distance/time from each start | User choice; matches the chart x-axis, and the binary search is already in `xAxis.ts` |
| State shape | Point indices tagged with a track id | Keeps today's index-based store and its survival across axis switches; avoids rewriting every hook in axis units |
| Chart zoom/selection owner | The longer track on the current axis | A range past the shorter track's end isn't lost |
| Stats | `<table>`, one column per track | User choice; compares row by row; accessible |
| Speed colors in compare | Disabled with a hint, choice kept | User choice; the gradient can't also tell A from B |
| Colors | Blue A (existing), orange B, in `src/settings.ts` | Distinct for color-blind users; editable like the speed colors |
| Selection highlight in compare | Each track in its own color over its dimmed line | An orange highlight would look like track B |
| Adding B | "Compare with…" button; drop zone starts over | User choice; keeps the drop zone's current meaning |
| Time axis | Only when both tracks have time | Comparing one timed track against nothing isn't a comparison |
| Chart legend | ECharts legend, not clickable, compare mode only | Satisfies the roadmap's "legend" without hidden-series state |
| Test data | New same-route "second run" fixture | User choice; realistic overlays and predictable stat differences |
| Base branch | Stacked on the speed-colored track branch | User choice; the speed-color interaction can be built and tested |

## Findings
- **Fixture:** `src/test/fixtures/run-b.gpx` was generated from `run.gpx` by a one-off script (not committed):
  - the first 130 of its 150 points, each moved 3 m north, two days later;
  - times between points stretched by 10%, HR + 5 bpm, and cadence removed.

  It covers a shorter, slower B and a field only A has. `run.gpx` is longer on both axes (1.47 km and 10:44, against B's 1.27 km and about 10:17), so A owns chart ranges with this pair. The tests swap the pair to cover B owning.
- **Store shape:** the track id is an optional field: `hover.track`, `zoomTrack` and `selectionTrack`, where absent means A, and the store also stores A as absent. Zoom and selection stay `PointRange` tuples, so every existing test passed without the `track: 'a'` additions that `validation.md` allowed. The only existing tests edited are the two `App.test.tsx` tests of the old "one file at a time" notice.
- **Axis choice lifted:** the chosen x-axis now lives in `App` and is passed to `ChartsPanel`. If no value is passed in, `ChartsPanel` keeps its own state, so its tests are unchanged. Both the map and the stats need the axis to line the tracks up.
- **ECharts' axis tooltip only lists the series nearest the pointer.** With two tracks sampled at different x values, B's value went missing in e2e. The tooltip now looks each track's value up at the axis position itself (`pointAtX`, the same binary search as alignment).
- **One file input:** "Compare with…" reuses the drop zone's hidden input, which remembers which button opened it. The page keeps a single `input[type=file]` (the e2e helpers locate it that way), and the input now has `multiple`. React doesn't handle the input's `cancel` event, so a native listener resets a cancelled compare pick.
- **Series order:** A's chart series is drawn above B's (higher `z`), as on the map. Without it, equal values, such as the fixture pair's elevation, hid A under B.
- **Two large tracks:** `kayak_MaratonPatzaichin2026.gpx` (16 880 points) was loaded as both A and B and measured in Chromium. No main-thread task over 50 ms occurred during any of these interactions:
  - a 61-step hover sweep over the Speed chart;
  - a 10-step brush;
  - a 5-step wheel zoom;
  - a 20-step map pan;
  - a 31-step map hover sweep.

  Loading the pair takes about 2.3 s of main-thread work (5 long tasks, the largest 810 ms): parsing two 6.4 MB files, their metrics and the first chart draw. That is the single-file cost twice. The 50 000-point alignment unit test does 10 000 point and range lookups in well under 500 ms.

## Context
- `specs/mission.md`: private (files never leave the browser), linked views, fast on large tracks, mobile-friendly, no saved libraries.
- `specs/techstack.md`: Leaflet, ECharts, a shared store driving map and charts by point index, pure tested calculations, SI units formatted in the UI only, small modules.
- `src/ui/upload/useGpxUpload.ts`: loads the first file only, shows the "Only one file at a time…" notice, and applies only the latest request.
- `src/ui/view/viewStore.ts`: hover, zoom and selection as point indices, coalesced per animation frame.
- `src/ui/charts/xAxis.ts`: `buildLineData`, `pointAtX`, `xOfPoint`, `rangeToX` and `xToRange`, the base for alignment.
- `src/ui/charts/lineOption.ts`: single-series line option. `useChartHover`, `useChartZoom` and `useChartBrush` link charts to the store.
- `src/ui/map/TrackMap.tsx`, `trackLayers.ts`, `useSelectionOverlay.ts`, `useMapHover.ts`, `hoverMarker.ts`: single-track map.
- `src/ui/upload/TrackSummary.tsx`: stat rows and badges, reused by the comparison table.
- `src/ui/App.test.tsx`: tests the "Only one file at a time" notice. This is the one existing test expected to change.
- `src/test/fixtures/run.gpx`: 150-point run, the data behind `public/sample.gpx`.
- The `src/settings.ts` WIP (thresholds 0.20, swapped colors) was stashed before branching (`git stash list`). The defaults on this branch are the committed ones.
