# Requirements – Phase 8: Speed/pace chart and axis toggle

## Scope
From `specs/roadmap.md` Phase 8:
- Speed/pace chart.
- Toggle x-axis: distance / time.

Also included (decided with the user):
- One chart with a **Speed / Pace** switch (default Speed). Speed in km/h; pace in min/km with an inverted y-axis so faster is up.
- Time axis shows **elapsed time** since the first point, pauses included.
- **One global x-axis toggle** above the charts that drives both the elevation and the speed chart. When the track has no timestamps, "Time" is disabled and the speed chart shows an empty state.
- On the time axis the lines **break at segment gaps**. Pace is `null` below 0.5 m/s (stopped, from Phase 6) so it doesn't spike; speed shows 0.

## Out of scope
- Hover linking, ECharts `connect` (Phase 10); dataZoom (Phase 11); brush (Phase 12); selection stats (Phase 13).
- HR/cadence charts (Phase 14).
- Metric/imperial toggle, responsive layout, touch gestures (Phase 15).
- Per-sport defaults (pace for running, speed for cycling), clock-time axis, moving time, splits (post-MVP).
- Remembering toggle choices across page reloads.

## API
```ts
// src/ui/charts/xAxis.ts
type XAxisMode = 'distance' | 'time'

interface LineData {
  /** [x, y] pairs in display units; a [x, null] break item is inserted between segments on the time axis. */
  data: [number, number | null][]
  /** Data index -> point index (-1 for break items). Identity on the distance axis. */
  dataToPoint: number[]
}

/** Pure: x values (km or elapsed s) paired with y values, with segment breaks on the time axis. */
function buildLineData(track: Track, metrics: TrackMetrics, mode: XAxisMode, ys: (number | null)[]): LineData

/** Pure: x-axis option for the mode (km labels, or elapsed-time labels at a nice interval). */
function buildXAxis(metrics: TrackMetrics, mode: XAxisMode): XAXisOption

/** Smallest of 1, 2, 5, 10, 15, 20, 30 min, 1, 2, 3, 6 h giving at most ~6 ticks. */
function niceTimeInterval(durationSeconds: number): number

// src/ui/charts/elevationOption.ts (changed)
function buildElevationOption(track: Track, metrics: TrackMetrics, mode: XAxisMode): ChartOption

// src/ui/charts/speedOption.ts
type SpeedMetric = 'speed' | 'pace'
function buildSpeedOption(track: Track, metrics: TrackMetrics, mode: XAxisMode, metric: SpeedMetric): ChartOption

// src/ui/format.ts (added)
function formatSpeed(metersPerSecond: number): string // "12.3 km/h"
function formatPace(secondsPerMeter: number): string // "5:12 /km"

// src/ui/charts/SegmentedControl.tsx
function SegmentedControl<T extends string>(props: {
  legend: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (value: T) => void
}): JSX.Element

// src/ui/charts/SpeedChart.tsx
function SpeedChart(props: { track: Track; metrics: TrackMetrics; mode: XAxisMode }): JSX.Element

// src/ui/charts/ChartsPanel.tsx – owns the x-axis mode; renders the toggle and both charts
function ChartsPanel(props: { track: Track; metrics: TrackMetrics }): JSX.Element
```

## Behavior
| Situation | Result |
|---|---|
| Track with time loaded | Toggle "X axis: Distance / Time" above the charts, Distance selected; elevation chart, then speed chart showing Speed |
| Select "Time" | Both charts switch to elapsed time: x from 0 to `totals.duration`, labels like "10:00", "1:00:00" |
| Select "Distance" | Both charts back to km |
| Track without time | "Time" option disabled (with a hint "No timestamps in this track"); charts use distance; speed chart region shows "This track has no timestamps, so speed and pace can't be shown." |
| Time selected, then a track without time loaded | Charts fall back to distance; the stored choice stays "Time" and applies again for the next track that has time |
| Select "Pace" in the speed chart | y-axis in min/km, inverted (faster up), labels "m:ss"; tooltip e.g. "1.23 km · 5:12 /km" |
| Select "Speed" | y-axis in km/h from 0; tooltip e.g. "1.23 km · 12.3 km/h" |
| Stopped points (< 0.5 m/s) | Speed shows 0; pace has a gap there (`connectNulls: false`) |
| Pace slower than 20:00 min/km (0.5–0.83 m/s) | Clipped at the bottom of the pace axis (axis capped at 20:00 min/km) so a short walk doesn't squash the chart |
| Time axis, track with several segments | Lines break between segments (no straight line across the pause) in both charts |
| Distance axis, several segments | Continuous lines (the gap has zero width on a distance axis) |
| Track without elevation, time axis | Elevation empty state as in Phase 7; speed chart follows the time axis |
| Another track loaded | Same chart instances; toggle states kept |
| Large track | Both charts keep `sampling: 'lttb'`, `animation: false`, `showSymbol: false` |

## UI
- `ChartsPanel` replaces the direct `ElevationChart` render in `App`, below the map.
- X-axis toggle: `SegmentedControl` with legend "X axis", options "Distance" and "Time"; a `<fieldset>` of native radio inputs styled as a segmented button group (keyboard and screen-reader support for free). Each option is at least 44 px tall.
- Speed chart: region `aria-label="Speed chart"`, heading "Speed" or "Pace" matching the selection, with its own `SegmentedControl` (legend "Speed or pace", options "Speed"/"Pace") in the header. Same size, border and theme as the elevation chart; line without area fill, own colour in `chartTheme.ts`.
- Time-axis labels and tooltips use `formatDuration`; speed/pace use `formatSpeed`/`formatPace`; distances `formatDistance`.
- Display-unit conversion (km, km/h, min/km) happens in the option builders; metrics stay SI.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Speed vs pace | One chart, Speed/Pace switch, default Speed | Same information, one chart's space; per-sport default is post-MVP |
| Pace axis | Inverted, min/km, capped at 20:00 min/km | Faster is up like speed; cap keeps walking/stops from flattening the running pace line (Claude's call, easy to drop) |
| Time axis | Elapsed seconds, pauses included, nice tick interval | Comparable across tracks; consistent with `totals.duration` |
| Toggle scope | One global x-axis toggle | Charts never disagree, ready for shared hover/zoom in Phases 10–11 |
| No time | "Time" disabled, speed empty state | Explains why; never shows an empty time axis |
| Toggle state | `useState` in `ChartsPanel`, kept across tracks | No global store needed until Phase 10 |
| Segment breaks | One `[x, null]` break item between segments on the time axis, with a `dataToPoint` index map | Single series per chart keeps tooltips simple; the map gives Phase 10 point indices |
| Stopped | Speed 0, pace `null` → gap | No infinite pace spikes |
| Toggle control | Native radio inputs in a `<fieldset>` | Accessible by default, tap-friendly |
| Speed chart without time on distance axis | Empty state, not a chart | Speed needs time on either axis |
| Branch / directory | Branch `2026-10-14-metrics-and-charts`; directory `2026-10-14-speed-chart` | One branch for Phases 6–8 as asked; spec naming convention |

## Risk
ECharts' LTTB sampling might drop or move the `null` break item on large tracks. If the gap disappears with sampling on, switch to one series per segment (same colour) with a tooltip formatter that shows only the series under the cursor, and keep `dataToPoint` semantics via `segmentStarts`.

## Context
- `specs/mission.md`: linked views (map and charts reflect the same position and range later), fast on large tracks, mobile-friendly with tap-sized controls, small steps.
- `specs/techstack.md`: ECharts with dataZoom/brush/linking later; shared state (context/Zustand) arrives with hover linking; SI units, formatting in the UI; components under ~200 lines.
- Phase 6: `TrackMetrics` with `distance` (m), `elapsed` (s | null), `speed` (m/s | null, 5 s window), `pace` (s/m | null below 0.5 m/s), `totals.duration`; `src/ui/format.ts`.
- Phase 7: `useECharts`, `echarts.ts` registration, `chartTheme.ts`, `buildElevationOption`, `ElevationChart` with empty state, `src/test/echartsMock.ts`.
- Fixtures: `run.gpx` (time, 644 s), `bike.gpx` (time, 717 s, 177 s pause between 2 segments), `no-ele-time.gpx` (no time, no elevation).
