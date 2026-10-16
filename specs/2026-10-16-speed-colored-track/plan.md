# Plan – Speed-colored track

Goal: color the map's track by speed relative to the average moving speed, with a toggle and a legend (see `specs/roadmap.md`, Post-MVP "Speed-colored track"). Details and decisions in `requirements.md`.

## 1. Settings and color math
1. Add `src/settings.ts` with the speed-color settings and defaults from `requirements.md` (thresholds, colors, smoothing window, gradient steps), plus a unit test that checks the defaults are valid.
2. Add `src/ui/map/speedColors.ts` (pure functions, no Leaflet):
   - `speedPosition(v, avg, settings)` returns `t` in [−1, 1].
   - `quantize(t, steps)`.
   - `gradientColor(t, colors)`, with HSL interpolation between slow/avg/fast.
   - `speedThresholds(avg, settings)` returns `{ lower, upper }`.
   - `getColorRuns(track, speed, avg, settings)` returns `{ color, latlngs }[]`, split at segment gaps and color-step changes. Consecutive runs share their boundary point so the line has no holes.
3. Unit tests:
   - Positions at, below and above the thresholds, clamping, and speed 0.
   - Exact stop colors at t = −1 / 0 / 1, with the midpoints passing through yellow and teal hues.
   - Runs: split at segment gaps, merging of same-step pairs, gray for pairs without speed, and no runs for tracks under 2 points.
   - A 50 000-point synthetic track builds quickly, and its run count follows the step changes rather than the point count.

## 2. Colored lines on the map
1. Pass `metrics` to `TrackMap` from `App`.
2. In `TrackMap`, compute the smoothed speed with `getSpeedSeries(track, distance, elapsed, smoothingSeconds)` using `useMemo`, only in Speed mode.
3. Extend `createTrackLayers` to draw colored runs when given a coloring, with the same weight as Plain. Switching modes swaps the line layers without refitting. Keep the markers above the lines.
4. Extend `createSelectionLayers` and `useSelectionOverlay` so that in Speed mode the selected stretch is drawn in its speed colors over the dimmed colored lines, still with the `track-selection` class.
5. Check by hand with the sample and a large file from `GpxFiles/`: colors look right, zooming and panning stay smooth, and toggling is instant.

## 3. Toggle
1. Add `src/ui/map/trackColor.ts` (`TrackColor = 'plain' | 'speed'`, `loadTrackColor` and `saveTrackColor` under `gpx-analyzer.trackColor`), with unit tests like `units.test.ts`.
2. Add `TrackColorToggle.tsx` ("Track color": Plain | Speed). Speed is disabled with the hint when the track has no average speed, and the map then draws Plain.
3. Render the toggle in a row directly above the map, and remember the choice.

## 4. Legend
1. Add `SpeedLegend.tsx`:
   - A gradient bar built from the same color function (CSS `linear-gradient` with the quantized stops), `aria-hidden`.
   - Lower threshold, "avg" and upper threshold labels using `formatSpeed` in the current units.
   - Accessible name "Speed colors".
2. Show it under the map only in Speed mode, and check it at 360 px width: no overlap, no horizontal scroll.

## 5. Tests
1. Component tests (Leaflet mock):
   - Plain draws one blue line per segment.
   - Speed draws colored runs.
   - The toggle swaps the lines without calling `fitBounds`.
   - The selection is drawn in speed colors in Speed mode.
   - Without timestamps Speed is disabled and Plain is drawn.
   - The legend shows and hides with the mode, and its labels follow Units.
   - The choice is restored from storage.
2. E2E `e2e/speed-colors.spec.ts`:
   - Plain by default. Read the map canvas pixels: only the plain blue stroke.
   - Switch to Speed: stroke pixels include red-, green- and blue-hued colors.
   - Legend thresholds match the summary's Avg speed × 0.75 / × 1.25, in metric and imperial.
   - Reload keeps Speed.
   - A selection draws `track-selection` paths in gradient colors (not orange).
   - Phone viewport: no horizontal scroll.
   - A track without timestamps disables Speed.
   - No console errors and no external requests.

   Use a track whose speed crosses both thresholds (the sample, or a fixture if not), and record which one in `requirements.md`.
3. Run the full gate (lint, format, typecheck, unit, e2e, e2e repeat, prod e2e) and fix every failure; never retry flaky tests away.

## 6. Docs
1. README: mention the speed-colored track and point to `src/settings.ts` for thresholds and colors.
2. Tick the "Speed-colored track" boxes in `specs/roadmap.md`, and record any findings in `requirements.md`.
