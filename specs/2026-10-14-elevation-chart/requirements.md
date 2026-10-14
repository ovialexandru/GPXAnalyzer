# Requirements – Phase 7: Elevation chart

## Scope
From `specs/roadmap.md` Phase 7:
- ECharts elevation vs distance.
- Handles tracks without elevation (hidden/empty state).

Also included (decided with the user):
- Own `useECharts` hook with tree-shaken `echarts/core` imports (no wrapper library).
- Filled area line with an axis tooltip showing distance and elevation.
- LTTB sampling so large tracks render fast.
- Empty-state card when the track has no elevation.
- Placement below the map, full width, about 220 px high.

## Out of scope
- Speed/pace chart and the distance/time x-axis toggle (Phase 8).
- Hover linking with the map and between charts, ECharts `connect` (Phase 9).
- dataZoom (Phase 10), brush selection (Phase 11), selection stats (Phase 12).
- Responsive layout, touch gestures, metric/imperial toggle (Phase 14).
- Gradient colouring, min/max markers, elevation smoothing for display.

## API
```ts
// src/ui/charts/echarts.ts
// Registers LineChart, GridComponent, TooltipComponent and CanvasRenderer once; re-exports `echarts` (core).
type ChartOption = ComposeOption<LineSeriesOption | GridComponentOption | TooltipComponentOption>

// src/ui/charts/useECharts.ts
/** Creates one chart when `containerRef` attaches, resizes it with a ResizeObserver, disposes it on detach. */
function useECharts(): { containerRef: (node: HTMLDivElement | null) => void; chart: ECharts | null }

// src/ui/charts/elevationOption.ts
/** Pure: option for elevation (m) vs distance (km). Data is one [km, m | null] pair per point. */
function buildElevationOption(track: Track, metrics: TrackMetrics): ChartOption

// src/ui/charts/ElevationChart.tsx
function ElevationChart(props: { track: Track; metrics: TrackMetrics }): JSX.Element
```

## Behavior
| Situation | Result |
|---|---|
| Track with elevation loaded | Chart appears below the map: x = distance in km from 0 to the total, y = elevation in m |
| Track without any elevation | No chart instance; an empty-state card in the same place reads "This track has no elevation data." |
| Some points lack elevation | Those points are `null`; the line has a gap there (`connectNulls: false`) |
| Track with several segments | Continuous line: distance does not grow across a gap (Phase 6), so there is nothing to break on a distance axis |
| Hover over the chart | Axis pointer plus tooltip, e.g. "1.23 km · 245 m" |
| Another track loaded | Same chart instance; `setOption(option, { notMerge: true })` replaces the data |
| Switching from a track with elevation to one without | Chart disposed, empty state shown; and back again creates a new chart |
| Container width changes | Chart resizes (ResizeObserver) |
| Large track (tens of thousands of points) | Rendered with `sampling: 'lttb'`, `animation: false`, `showSymbol: false`; stats are not affected (they use full data) |
| Component unmounts | `chart.dispose()` and the ResizeObserver disconnected (StrictMode-safe) |

## UI
- Section below `TrackMap`, `role="region"`, `aria-label="Elevation chart"`, with a small visible heading "Elevation".
- Chart container: full column width, height 220 px, `min-height: 180px`; rounded border like the map and summary (CSS module).
- Empty state: same region and heading, a muted text card instead of the canvas, same height so the layout doesn't jump.
- Series: `type: 'line'`, `areaStyle` with a translucent fill, one colour defined in `src/ui/charts/chartTheme.ts` (with grid padding and font sizes).
- x-axis: `type: 'value'`, `min: 0`, `max` = total distance in km, labels with up to 1 decimal ("2.5 km" style via formatter).
- y-axis: `type: 'value'`, `scale: true` (not forced to 0), labels in whole meters.
- Tooltip: `trigger: 'axis'`, formatter uses `formatDistance` and `formatElevation` from `src/ui/format.ts`.
- Display-unit conversion (m → km) happens in `buildElevationOption`; metrics stay SI.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Integration | Own `useECharts` hook (callback ref, like `useLeafletMap`) | Full control over instance, events and options for Phases 9–11; no wrapper dependency |
| Imports | `echarts/core` + only the chart, components and renderer used | Smaller bundle than full `echarts`; each phase registers what it needs |
| Renderer | Canvas | Fast for many points; SVG is not needed |
| Option building | Pure `buildElevationOption` | Unit-testable without a canvas; the component only wires it up |
| No elevation | Empty-state card | Explains why the chart is missing instead of a silent gap |
| Look | Filled area + axis tooltip | Familiar elevation profile; tooltip gives exact values before hover linking exists |
| Sampling | `sampling: 'lttb'` | Keeps shape on large tracks (techstack performance note) |
| Animation | Off | Instant redraw on new tracks; avoids timing issues in tests |
| Placement | Below the map, 220 px | Simple stack for now; full layout in Phase 14 |
| Data | `[km, m \| null]` pairs, one per point, same order as `track.points` | Data index = point index, ready for hover linking in Phase 9 |
| Unit tests | `vi.mock('echarts/core')` via `src/test/echartsMock.ts`, plus a `ResizeObserver` stub | jsdom has no canvas or layout; real rendering checked by Playwright |
| Lint | Add `echarts`, `echarts/**` to the restricted imports for `model`/`parser`/`metrics` | Keeps the chart library in the UI layer |
| Location | `src/ui/charts/` | Organised by feature, like `src/ui/map/` |
| Branch / directory | Branch `2026-10-14-metrics-and-charts`; directory `2026-10-14-elevation-chart` | One branch for Phases 6–8 as asked; spec naming convention |

## Context
- `specs/mission.md`: linked views (later phases), fast on large tracks, mobile-friendly, small steps.
- `specs/techstack.md`: Apache ECharts for charts (dataZoom, brush, linking later); downsample for rendering (`sampling`/LTTB) but compute stats on full data; formatting only in the UI; components under ~200 lines.
- Phase 6 provides `getTrackMetrics(track)` (computed once in `App`) with `distance` (m, per point), `elapsed`, `speed`, `pace` and `totals`; `src/ui/format.ts` has `formatDistance`, `formatDuration`, `formatElevation`.
- Phase 5 established the pattern: library used directly via a small hook, mocked in unit tests (`src/test/leafletMock.ts`), real rendering in Playwright.
- Fixtures: `run.gpx` and `bike.gpx` have elevation; `no-ele-time.gpx` has none.
