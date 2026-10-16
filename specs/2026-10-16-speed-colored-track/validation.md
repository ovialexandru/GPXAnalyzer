# Validation – Speed-colored track

The implementation succeeded and can be merged when every item under "Before merge" holds on a clean checkout of branch `2026-10-16-speed-colored-track`, and CI's `check` job passes on the PR.

## Before merge – local (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including the new tests for the settings, color math, color runs, storage and map/legend components.
- [ ] `npm run test:e2e` passes, including `e2e/speed-colors.spec.ts`, with no real external requests.
- [ ] `npm run test:e2e:repeat` passes with **zero** failures.
- [ ] `npm run test:e2e:prod` passes against the production build under `/GPXAnalyzer/`.

## Before merge – CI on the PR
- [ ] The `check` job passes; `deploy` and `smoke` are skipped.

## Behaviour
- [ ] On first visit the map draws the plain blue line and the toggle shows "Plain"; no legend.
- [ ] Switching to "Speed" colors the line: slow stretches red, around-average green, fast blue, with smooth transitions (yellow/orange and teal in between, no brown); stops appear red.
- [ ] Colors compare with the whole track's average moving speed: the legend's middle label equals the summary's "Avg speed", and its outer labels are avg × 0.75 and avg × 1.25 (formatted in the current units).
- [ ] Switching Units updates the legend labels; the map colors don't change.
- [ ] Switching mode doesn't refit or move the map; markers, hover marker and selection stay.
- [ ] With a selection in Speed mode, the selected stretch shows in its speed colors over the dimmed track (no orange); in Plain mode the selection looks as before.
- [ ] The choice survives a reload; with blocked storage the app still works and starts in Plain.
- [ ] A track without timestamps: "Speed" is disabled with the hint, the plain line is drawn, and the saved choice applies again to the next timed track.
- [ ] Segment gaps are not bridged in either mode.
- [ ] Changing a value in `src/settings.ts` (e.g. `below: 0.1`, another `fast` color) changes the map and legend after a rebuild (checked once by hand, then reverted).

## Performance and mobile
- [ ] The largest file in `GpxFiles/` (~17k points): toggling Speed responds without visible delay, panning and zooming stay smooth, and the number of colored polylines is far below the point count (logged once by hand or covered by the 50k-point unit test).
- [ ] At 360 px width: toggle and legend fit, labels don't overlap, no horizontal page scroll; the toggle options are tap-sized.

## Design
- [ ] Color math lives in pure functions with no Leaflet dependency; Leaflet code only turns runs into polylines.
- [ ] Charts and stats are unchanged (their 5 s speed series is untouched); existing unit and e2e tests pass without edits other than the `TrackMap` `metrics` prop.
- [ ] Settings live in `src/settings.ts` with documented defaults matching the roadmap (±25%, red/green/blue).
- [ ] No component over ~200 lines; no new npm dependencies; `retries: 0` unchanged.

## Merge gate
- [ ] The "Speed-colored track" checkboxes in `specs/roadmap.md` are ticked.
- [ ] README mentions the feature and the settings file.
- [ ] Earlier phases' validations still hold (the full e2e suite passes on the dev server and the prod build).
- [ ] No files from `GpxFiles/` are committed.
