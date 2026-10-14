# Requirements – Phase 10: Hover linking

## Scope
From `specs/roadmap.md` Phase 10:
- Hover on a chart moves a marker on the map.
- Hover on the track shows the position on the charts.

Decided with the user:
- **Shared state:** a tiny view store read through React's `useSyncExternalStore`. No new dependency, and only the subscribers re-render on each move.
- **Feedback:** a marker on the map, plus the axis pointer on both charts. Only the chart under the cursor shows its tooltip. Hovering the map snaps to the nearest track point within 15 px.
- **Store shape grows per phase:** Phase 10 adds only `hover`. Zoom (Phase 11) and selection (Phase 12) come later.
- **One linking mechanism:** charts and map write to the store and react to it. Chart↔chart linking also goes through the store, not `echarts.connect`.
- Branch and spec directory `2026-10-14-hover-linking`, from `main`.

## Out of scope
- Zoom, brush selection, selection stats (Phases 11–13).
- A tooltip on the map marker, and tooltips on charts that are not under the cursor.
- Clicking a chart or the map to pin a position.
- Keyboard-driven hover (stepping through points with arrow keys).
- Pinch and touch polish beyond tap/drag on a chart and tap on the map (Phase 15).

## API
```ts
// src/ui/view/viewStore.ts
type HoverSource = 'map' | 'elevation' | 'speed'
interface Hover {
  index: number // point index into track.points
  source: HoverSource // who set it; that view handles its own feedback
}
interface ViewState {
  hover: Hover | null
}
interface ViewStore {
  getState(): ViewState
  subscribe(listener: () => void): () => void
  /** Coalesced: at most one notification per animation frame; the last value wins. */
  setHover(hover: Hover | null): void
}
function createViewStore(): ViewStore

// src/ui/view/ViewStoreContext.tsx
/** Provides one store per `resetKey` (the loaded track) without remounting its children. The context value changes only then, so hovering re-renders nothing. */
function ViewStoreProvider(props: { resetKey?: unknown; children: ReactNode }): JSX.Element
/** Re-renders only when the selected slice changes (Object.is). */
function useViewState<T>(selector: (s: ViewState) => T): T
function useViewStore(): ViewStore

// src/metrics/nearest.ts (pure, no UI imports)
/**
 * Returns a finder for the nearest track point to (lat, lon), using an equirectangular
 * projection precomputed once per track. Linear scan, O(n) per call. Null for an empty track.
 */
function createNearestPointFinder(track: Track): (lat: number, lon: number) => number | null

// src/ui/charts/xAxis.ts (added)
/** Point index nearest to axis value x (binary search; break items are skipped). Null when there's no data. */
function pointAtX(line: LineData, x: number): number | null
/** Axis value of a point, or null when the point isn't on this axis (no time on the time axis). */
function xOfPoint(metrics: TrackMetrics, mode: XAxisMode, index: number): number | null
```

## Behavior
| Situation | Result |
|---|---|
| Mouse moves over a chart's plot area | `hover = { index, source: chart }`. The map marker moves to that point, the other chart shows its axis pointer at the same point, and only this chart shows a tooltip |
| Mouse leaves a chart (`globalout`) | `hover` cleared if this chart set it. Marker and pointers hidden |
| Mouse over the map within 15 px of the track | `hover = { index, source: 'map' }` for the nearest point. The marker sits on it, and both charts show their axis pointer without a tooltip |
| Mouse over the map farther than 15 px, or leaving the map | `hover` cleared if the map set it |
| Hovered point has no time while the x-axis is Time | Charts hide the pointer; the map marker still shows |
| Chart with an empty state (no elevation / no time) | Takes no part; the others still link |
| Time axis segment-break item | Never hovered: snaps to the nearest real point |
| Tap or drag on a chart (touch) | Same as mouse hover (ECharts axis trigger on touch) |
| Tap on the map near the track (touch) | Same as map hover; a tap away from the track clears it |
| New track loaded | Fresh store: `hover` is `null` |
| X-axis toggle | `hover` is kept; pointers follow on the next move |

## UI
- **Map marker:** an `L.marker` with an `L.divIcon`: a 14 px amber (`#f59e0b`) dot with a 2 px white border. It is a DOM element, so it sits above the canvas-rendered track and Playwright can find it. It is non-interactive and carries `data-hover-marker`. It is removed from the map while `hover` is `null`, and created once and moved with `setLatLng`.
- **Charts:** the existing `axis` tooltip on the hovered chart. Linked charts show the vertical axis pointer line only.
- No layout change, and no horizontal page scroll at 375 px.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| State | Small store + `useSyncExternalStore`, provided by context (the store object, not its state) | User choice; no dependency; only subscribers re-render (mission: fast on large tracks) |
| Update rate | Coalesced to one notification per animation frame | Mousemove can fire faster than the display refreshes; caps the work per frame |
| Hover identity | Point index plus `source` | techstack.md: views refer to points by index. `source` lets the origin view skip echoing and decide on tooltips |
| Chart↔chart linking | Through the store with `dispatchAction`, not `echarts.connect` | User choice; one mechanism for map and charts, independent of each chart's data indexing |
| Map nearest point | Precomputed equirectangular projection, linear scan, 15 px tolerance checked in screen space | ~100k points scan well under 1 ms. Accurate at track scale. 15 px is easy to hit and also works for a fingertip |
| Marker as DOM `divIcon` | Yes | Drawn above the canvas track; testable in Playwright; moving it doesn't redraw the track |
| Store lifetime | One store per loaded track | A new track starts with no hover, and later no zoom or selection, without reset code |
| Files | `src/ui/view/` for the store, `src/metrics/nearest.ts`, hover hooks next to the chart and map code | Small focused modules; the metrics layer stays UI-free |

## Context
- `specs/mission.md` principle 3: map and charts always reflect the same hover position.
- `specs/techstack.md`: shared `hoverIndex` drives map and charts; layers parser → metrics → ui; components under ~200 lines.
- Today: `App` computes `getTrackMetrics` once. `TrackMap` uses one Leaflet map (`preferCanvas: true`, non-interactive polylines). `ElevationChart` / `SpeedChart` each use `useECharts` and `buildLineOption`, whose `buildLineData` returns `dataToPoint` (with `-1` break items on the time axis). The fake ECharts in `src/test/echartsMock.ts` has `setOption`, `on`, `off`, `resize`, `dispose`. The fake Leaflet in `src/test/leafletMock.ts` has no `marker` / `divIcon` or map `on` handlers yet.
- Fixtures: `run.gpx` (150 points), `bike.gpx` (200 points, second segment at index 100), `no-ele-time.gpx` (80 points, no time or elevation).

## Known limitations
- The map hover uses the nearest point, not the nearest spot along a line segment, so with sparse recording the marker jumps between fixes.
- Where the track crosses or retraces itself, the nearest point can come from either pass.
