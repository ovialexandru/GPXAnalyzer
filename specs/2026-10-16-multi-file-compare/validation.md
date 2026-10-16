# Validation – Multi-file compare

The implementation succeeded and can be merged when every item under "Before merge" holds on a clean checkout of branch `2026-10-16-multi-file-compare`, and CI's `check` job passes on the PR. The speed-colored track PR must be merged into `main` first, and the PR then targets `main`.

## Before merge – local (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including the new tests for the fixture, settings, alignment, upload rules, view store, chips, map, charts and stats table.
- [ ] `npm run test:e2e` passes, including `e2e/compare.spec.ts`, with no real external requests.
- [ ] `npm run test:e2e:repeat` passes with **zero** failures.
- [ ] `npm run test:e2e:prod` passes against the production build under `/GPXAnalyzer/`.

## Before merge – CI on the PR
- [ ] The `check` job passes; `deploy` and `smoke` are skipped.

## Behaviour – single track (regression)
- [ ] With one track loaded, the app looks and behaves as before: summary heading, stats, map, charts, hover, zoom, selection, speed colors and units.
- [ ] Existing unit and e2e tests pass **without edits**, except:
  - the `App.test.tsx` test of the old "Only one file at a time" notice;
  - the mechanical `track: 'a'` additions to store calls in unit tests.

## Behaviour – compare
- [ ] "Compare with…" appears once a track is loaded. Choosing a file adds B, and choosing again replaces B.
- [ ] Dropping or choosing two files loads A and B. Three or more files load the first two and show the notice.
- [ ] A bad file never removes a loaded track, and its error names the file.
- [ ] Chips show each track's swatch, letter and name. Removing B returns to single-track mode, and removing A makes B the new A. Both reset the hover, zoom and selection.
- [ ] Map:
  - both tracks are drawn in blue (A) and orange (B), with start/finish markers;
  - the map fits both tracks, and so does "Fit to track".
- [ ] Hover from either track or any chart shows one marker per track at the same distance (or time). There is no marker for a track that has no point there.
- [ ] Every chart:
  - overlays A and B in the track colors, with a legend naming both;
  - shows a tooltip listing both values;
  - uses an x-axis that covers the longer track.
- [ ] HR and cadence charts appear when either track has the data. The time axis is disabled with the hint unless both tracks have timestamps.
- [ ] Zoom, brush and Reset are linked across all charts and the map.
- [ ] A selection highlights each track's own range in its color. A selection past B's end keeps its full extent on A, and B shows "Not in selection".
- [ ] The stats table:
  - shows the summary rows for A and B in the current units, with "–" for missing values;
  - with a selection, shows each track's stats for its own aligned range, updated live while brushing;
  - follows the Units toggle.
- [ ] Track color "Speed" is disabled with the hint while comparing. The legend is hidden. The saved choice applies again after removing B.

## Performance and mobile
- [ ] Two large files from `GpxFiles/` (about 17k points each): hover, chart zoom, brush and map pan stay smooth (checked once by hand, numbers recorded in `requirements.md` Findings).
- [ ] The 50 000-point alignment unit test passes, showing lookups are binary searches, not linear scans.
- [ ] At 360 px width:
  - chips, the "Compare with…" button and the stats table fit, with the table scrolling inside its card;
  - the page has no horizontal scroll;
  - controls are tap-sized.

## Design
- [ ] Alignment is in pure, unit-tested functions with no React or Leaflet dependency. Metrics and parser are unchanged.
- [ ] Single-track chart options are unchanged (asserted in the existing option tests).
- [ ] `COMPARE_COLORS` lives in `src/settings.ts` with documented defaults.
- [ ] Stat rows are defined once and shared by `TrackSummary` and `CompareStats`.
- [ ] No component over ~200 lines, no new npm dependencies, and `retries: 0` unchanged.
- [ ] Files never leave the browser: no new network requests (the e2e external-request check is empty).

## Merge gate
- [ ] The "Multi-file compare" checkboxes in `specs/roadmap.md` are ticked, with the two-track limit noted.
- [ ] README describes comparing tracks and `COMPARE_COLORS`.
- [ ] `requirements.md` Findings are filled in.
- [ ] Earlier phases' validations still hold (the full e2e suite passes on the dev server and the prod build).
- [ ] No files from `GpxFiles/` are committed; `run-b.gpx` is derived from the committed `run.gpx` only.
