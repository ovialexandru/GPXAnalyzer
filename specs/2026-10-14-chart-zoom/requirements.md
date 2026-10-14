# Requirements – Phase 11: Chart zoom

## Scope
From `specs/roadmap.md` Phase 11:
- dataZoom: wheel/pinch plus a slider.
- Zoom synced across charts.
- Reset button.

Decided with the user:
- **Gestures:** wheel (desktop) and pinch (touch) zoom, and the slider pans and resizes. **Plain drag on the plot area is not used for zoom or pan**; it is kept for brush selection in Phase 12, so the two never conflict.
- **Map:** unchanged by zoom. The map-linked range is the Phase 12 selection.
- **Store:** the Phase 10 view store gains `zoom`, and linking goes through the store with `dispatchAction`, the same mechanism as hover.
- Branch and spec directory `2026-10-14-chart-zoom`, from `main`. Rebase onto the merged Phase 10 before implementing.

## Out of scope
- Brush selection, "Zoom to selection" (Phase 12).
- Fitting or dimming the map to the zoomed section.
- Keyboard zoom shortcuts.
- Touch polish beyond pinch and the slider: gesture tuning, page-scroll conflicts on phones (Phase 15).

## API
```ts
// src/ui/view/viewStore.ts (ViewState and ViewStore gain)
/** Inclusive point indices [first, last] of the visible window; null = whole track. */
type PointRange = [first: number, last: number]
interface ViewState {
  hover: Hover | null
  zoom: PointRange | null
}
interface ViewStore {
  // …existing
  /** Coalesced per animation frame, like setHover. A range covering the whole track is stored as null. */
  setZoom(zoom: PointRange | null): void
}
/** pointCount lets setZoom recognise the whole track; ViewStoreProvider takes it as a prop. */
function createViewStore(pointCount?: number): ViewStore

// src/ui/charts/xAxis.ts (added)
/** Axis values for a point range on this axis; null when no point of the range is on the axis. */
function rangeToX(metrics: TrackMetrics, mode: XAxisMode, range: PointRange): [number, number] | null
/** Point range covered by axis values [x0, x1]: first point with x >= x0, last with x <= x1. */
function xToRange(line: LineData, x0: number, x1: number): PointRange | null

// src/ui/charts/zoomOption.ts (pure)
/** dataZoom components: always the 'inside' zoom, plus the slider when withSlider. */
function buildDataZoom(mode: XAxisMode, withSlider: boolean): ChartOption['dataZoom']
```

## Behavior
| Situation | Result |
|---|---|
| Wheel over a chart's plot area (desktop) | Zooms that chart around the cursor; the other chart follows to the same point range |
| Pinch on a chart (touch) | Same as the wheel |
| Plain drag on the plot area | Nothing (no pan); kept for Phase 12 brushing |
| Dragging the slider body or its handles | Pans or resizes the window; both charts follow |
| Zoom span limit | Stops at a minimum window of 50 m (Distance axis) or 30 s (Time axis) |
| Zoomed in | "Reset zoom" is enabled |
| Click "Reset zoom" | `zoom = null`; both charts show the whole track; the button is disabled |
| X-axis toggle while zoomed | The same point range stays visible on the new axis |
| Zoom window edge on an untimed point (Time axis) | Snaps to the nearest timed point inside the range |
| Hovered point outside the visible window | That chart hides its pointer; the map marker still shows (Phase 10) |
| Hover inside the zoomed window | Works as in Phase 10 |
| One chart in its empty state | The other chart zooms alone, with the slider |
| New track loaded | Fresh store: `zoom` is `null` |
| Map | Unchanged by zoom |

## UI
- **Slider:** one ECharts `slider` dataZoom, under the **last chart that has data** (speed, or elevation when the track has no time). The chart above it has only the `inside` zoom. The slider shows the track's shape faintly (the ECharts default data shadow), and the chart's height grows to fit it so the plot area doesn't shrink.
- **Reset zoom:** a button in a new chart toolbar row, next to the X-axis toggle. It is at least 44 × 44 px (tap-sized, like the toggles), disabled when not zoomed, and named "Reset zoom".
- **Y axis:** fits the visible data (`filterMode: 'filter'`) for elevation and speed. Pace keeps its computed fixed range.
- Charts' x-axes stay aligned (same `GRID`). No horizontal page scroll at 375 px.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Plain drag | Not bound to zoom/pan | User choice; Phase 12 brush owns drag; no mode toggle needed |
| Map on zoom | Unchanged | User choice; keeps the phase small; the map follows the selection (Phase 12) |
| Zoom state | Point-index range in the store | techstack.md: views refer to points by index; survives the x-axis toggle without conversion bugs |
| Sync | Store + `dispatchAction({ type: 'dataZoom', startValue, endValue })` | Same mechanism as hover (Phase 10 decision) |
| `filterMode` | `'filter'` | LTTB then samples only the visible window, so zooming shows full detail on large tracks (mission: fast on large tracks). The y-axis fits the visible data |
| Slider count | One, under the last chart with data | Saves vertical space on phones; one control drives both charts |
| Minimum window | 50 m / 30 s (`minValueSpan`) | Below that the 5 s speed window and GPS noise dominate |
| Reset placement | Chart toolbar, always present, disabled when not zoomed | No layout shift when zooming |
| Files | `zoomOption.ts`, `useChartZoom.ts`, `ChartToolbar.tsx` in `src/ui/charts/` | Keeps `ChartsPanel` and the chart components under ~200 lines |

## Context
- Phase 10 adds the view store (`src/ui/view/`), with `hover`, the per-frame coalescing and the `source` convention, plus `pointAtX` / `xOfPoint` in `xAxis.ts` and the extended ECharts mock (`dispatchAction`, event emit).
- `src/ui/charts/echarts.ts` registers only `LineChart`, `GridComponent`, `TooltipComponent`, `CanvasRenderer`, so `DataZoomComponent` must be added there.
- `CHART_HEIGHT` is 220 px; `GRID.bottom` is 28 px.
- `ChartsPanel` owns the X-axis toggle state (`SegmentedControl`, 44 px targets).

## Known limitations
- The mouse wheel over a chart zooms instead of scrolling the page. Scrolling works everywhere else.
- On phones, a one-finger drag on a chart doesn't scroll the page (it's kept for the brush). Phase 15 revisits touch gestures.
