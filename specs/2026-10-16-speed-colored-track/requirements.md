# Requirements – Speed-colored track

## Scope
From `specs/roadmap.md`, Post-MVP "Speed-colored track":
- Polyline colored by speed relative to the track's avg (moving) speed, as a red → green → blue gradient (red below avg − 25%, green within avg ± 25%, blue above avg + 25%).
- Thresholds (the ±25% bands) and colors editable in a settings file, with those values as defaults.
- Legend showing the color scale and speed thresholds.
- Toggle between plain and speed-colored polyline.

Today the map draws every track as one plain blue line. This phase adds a second way to draw it: each stretch is colored by how fast it was compared with the track's average moving speed, so slow and fast parts stand out at a glance. A toggle above the map switches between the two, and a legend under the map explains the colors in the current units.

Decided with the user:
- **Smoothed speed for coloring.** Colors use the speed over a longer centered window (default 15 s, in the settings file). This is the existing `getSpeedSeries` with a different `windowSeconds`, used only by the map. Charts and stats keep their 5 s speed.
- **Smooth gradient,** not three solid bands: pure "avg" green at the average speed, blending to full red at the lower threshold and to full blue at the upper one, clamped beyond.
- **Toolbar above the map, Plain by default.** A "Track color: Plain | Speed" segmented control (same component as Units). The legend shows under the map only in Speed mode. The choice is remembered between visits.
- **Proof by canvas pixel sampling** in e2e, plus unit tests for the color math.
- Branch and spec directory `2026-10-16-speed-colored-track`.

## Out of scope
- An in-app settings editor. The settings file is edited in the repo and takes effect on the next build.
- Coloring by anything other than speed (heart rate, gradient, pace zones), and per-sport defaults (Post-MVP "Sport-specific metrics").
- Coloring the charts. The Speed chart is unchanged.
- Thresholds relative to the selection. Colors always compare with the whole track's average.

## Color model
- **Reference:** the whole track's average moving speed `a` (`metrics.totals.avgSpeed`, the value shown as "Avg speed" in the summary).
- **Thresholds:** lower `L = a × (1 − below)` and upper `U = a × (1 + above)`. The defaults `below = above = 0.25` give avg ± 25%.
- **Position** `t` in [−1, 1] for a smoothed speed `v`:
  - for `v < a`: `t = −min(1, (a − v) / (a − L))`
  - otherwise: `t = min(1, (v − a) / (U − a))`

  Stopped stretches (speed 0) are therefore full red.
- **Color:** `t = −1` gives `slow` (red), `t = 0` gives `avg` (green), `t = 1` gives `fast` (blue). Colors in between are interpolated in HSL between the two neighbouring stops, so red → green passes through orange and yellow (not muddy brown), and green → blue passes through teal.
- **Quantized gradient:** `t` is rounded to `gradientSteps` steps per side (default 16, so 33 colors). Consecutive point pairs with the same step share one polyline. At that resolution the line still reads as a gradient, and the polyline count stays small: it depends on how often the step changes, not on the point count.
- **Per pair:** the line between points `i` and `i+1` (same segment) uses the mean of their two smoothed speeds. When either point has no speed (no time), the pair is drawn in the `noSpeed` color (neutral gray).
- Segment gaps stay gaps, as in Plain mode.

## Settings file
`src/settings.ts`, a typed constant with a comment per field. Defaults:

| Field | Default | Meaning |
|---|---|---|
| `below` | `0.25` | Lower threshold, as a fraction below avg (0 < below < 1) |
| `above` | `0.25` | Upper threshold, as a fraction above avg (> 0) |
| `colors.slow` | `#dc2626` | Color at and below the lower threshold |
| `colors.avg` | `#16a34a` | Color at avg |
| `colors.fast` | `#2563eb` | Color at and above the upper threshold |
| `colors.noSpeed` | `#9ca3af` | Stretches without timestamps |
| `smoothingSeconds` | `15` | Speed window used for coloring |
| `gradientSteps` | `16` | Color steps per side of the gradient |

A unit test checks the defaults are valid: the ranges above, and `#rrggbb` colors. The color functions take the settings as a parameter, so tests can pass other values.

## Toggle
- A "Track color" `SegmentedControl` with "Plain" and "Speed" options, in a row directly above the map.
- Plain is the default. The choice is saved in `localStorage` under `gpx-analyzer.trackColor`, with the same error handling as Units: a missing, invalid or blocked value means Plain.
- When the track has no average speed (no timestamps, or never moving), "Speed" is disabled with the hint "This track has no timestamps, so it can't be colored by speed." and the map draws Plain. The saved choice is kept for the next track.
- Switching modes replaces the track lines without refitting the map or changing its zoom, and keeps the start/finish markers, the hover marker and the selection.

## Selection and hover in Speed mode
- With a selection, the colored base lines are dimmed (`DIMMED_OPACITY`, as today). The selected stretch is drawn above them **in its speed colors** at full opacity and highlight weight, not in orange, because orange would clash with the gradient. It keeps the `track-selection` class on the SVG paths.
- In Plain mode the selection is unchanged (orange over dimmed blue).
- The hover marker, start/finish markers and "Fit to track" behave the same in both modes.

## Legend
- Shown under the map in Speed mode only. It is a horizontal gradient bar (slow → avg → fast, the same interpolation as the map) with three labels: the lower threshold speed, the average speed (labelled "avg") and the upper threshold speed. All three are formatted with `formatSpeed` in the current units, and the labels update when Units change.
- Accessible name "Speed colors". Each label is real text, and the bar itself is `aria-hidden`.
- Fits a 360 px wide phone without horizontal page scroll. Labels stay readable (no overlap) at that width.
- The legend always shows speed (km/h or mph), even when the Speed chart is switched to Pace.

## Code layout
- `src/settings.ts`: the settings constant and its type.
- `src/ui/map/speedColors.ts`: pure functions for position, color interpolation, quantization and building color runs per segment (`{ color, latlngs }[]`). They have no Leaflet dependency, and their unit tests use a 50 000-point synthetic track to show the run count is bounded by step changes.
- `src/ui/map/trackLayers.ts`: `createTrackLayers(track, coloring?)` builds the plain or colored lines. `createSelectionLayers` gets the same optional coloring.
- `src/ui/map/trackColor.ts`: the type plus load/save, like `units.ts`.
- `TrackColorToggle.tsx` and `SpeedLegend.tsx` in `src/ui/map/`.
- `TrackMap` receives `metrics` (distance, elapsed, average speed). The smoothed speed is computed with `useMemo` once per track and only when needed.
- No component over ~200 lines. No new npm dependencies.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Speed for colors | `getSpeedSeries` with a 15 s window | User choice; fewer flickering runs on noisy GPS, and charts stay unchanged |
| Color scale | Smooth gradient | User choice |
| Gradient rendering | Quantized to 16 steps per side, one polyline per run | A per-pair polyline would mean ~50k layers on large tracks; quantized runs look the same and stay fast |
| Interpolation | HSL between the stops | RGB mixing of red and green goes brown; HSL passes through yellow |
| Reference speed | Whole-track average moving speed | Matches the roadmap and the summary's "Avg speed"; colors don't shift when selecting |
| Settings | TypeScript module `src/settings.ts` | No backend and no runtime fetch needed; typed and unit-tested; edited and rebuilt |
| Toggle and legend | Segmented control above the map, legend under it, Plain default, remembered | User choice; consistent with Units and the chart switches; nothing covers the map on phones |
| Selection in Speed mode | Selected stretch in its own speed colors over the dimmed track | An orange highlight would be lost in the gradient |
| No timestamps | Speed disabled with a hint, Plain drawn, saved choice kept | Same pattern as the Speed chart's empty state |
| E2E proof | Canvas pixel sampling | User choice; tiles are stubbed transparent, so stroke pixels are readable on Windows and Linux CI alike |

## Findings
- **E2E track:** the sample (`public/sample.gpx`, same data as `run.gpx`, avg 8.2 km/h) crosses both thresholds with the 15 s speed: 43 points at or below the lower one and 21 at or above the upper one. The e2e uses "Try a sample track", and no new fixture was needed.
- **Large track** (`GpxFiles/kayak_MaratonPatzaichin2026.gpx`, 16 880 points, 1 s recording):
  - Defaults give 6 145 color runs (about one per 3 points). The colors hover around avg and cross the 1.6% steps often.
  - Building the runs takes under 10 ms.
  - Switching Plain/Speed, including Leaflet's canvas redraw, takes 45–72 ms in Chromium.
  - Panning only shifts the canvas, which is redrawn after each pan or zoom ends.

  That is fast enough to keep the defaults. Fewer steps or a longer window would cut the runs (8 steps: 3 371; 30 s window: 3 450), so both stay settings.
- **E2E canvas reads:** reading the map canvas directly makes Chrome log a `willReadFrequently` warning after a few reads, which the console check catches. The spec copies the canvas into a fresh one and reads that instead.
- **E2E typing:** `tsconfig.node.json` gets the `DOM` lib, because functions passed to `evaluate` run in the page and use canvas/document types.
- The page now has two "Speed" radios ("Track color" and the chart's "Speed or pace"). They are in differently named groups, and the tests scope to the group.
- Changing `src/settings.ts` (`below: 0.1`, a purple `fast`) changed the map and the legend (lower label 7.4 km/h = 8.2 × 0.9). This was checked once on the dev server and reverted.

## Context
- `specs/mission.md`: private, fast on large tracks (tens of thousands of points), mobile-friendly, linked views.
- `specs/techstack.md`: Leaflet with OSM tiles; pure, unit-tested calculations; SI units, formatted in the UI only; small modules.
- `src/ui/map/useLeafletMap.ts`: the map uses `preferCanvas: true`, so the track lines are drawn on a canvas. The selection uses its own SVG renderer above it.
- `src/ui/map/trackLayers.ts`: plain line `#1d4ed8`, weight 4; start marker green, finish marker red.
- `src/ui/map/useSelectionOverlay.ts`: dims `baseLines` and draws the selection layers, re-reading `baseLines` when the selection changes.
- `src/metrics/speed.ts`: `getSpeedSeries(track, distance, elapsed, windowSeconds = 5)`. `src/metrics/rangeStats.ts`: `avgSpeed` is moving distance / moving time.
- `src/ui/units/units.ts`: the `localStorage` load/save pattern. `src/ui/common/SegmentedControl.tsx`: options with `disabled` and `hint`.
- `e2e/helpers.ts`: OSM tiles are served as a transparent 1×1 PNG.
- `public/sample.gpx`: 300 points, about 10:44.
