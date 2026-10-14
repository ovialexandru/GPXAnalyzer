# Requirements – Phase 12: Range selection

## Scope
From `specs/roadmap.md` Phase 12:
- Brush selection on a chart.
- Selected segment highlighted on the map.
- Clear selection.

Decided with the user:
- **Gesture:** a plain drag across a chart's plot area brushes a range (Phase 11 kept drag free for this).
- **Map:** the selection is drawn in a contrasting color over the track, and the rest of the track is dimmed. The map doesn't move.
- **No auto-zoom:** the brush stays visible in the current view. A **"Zoom to selection"** button sits next to "Clear selection" and "Reset zoom".
- **Store:** the view store gains `selection`; both charts and the map follow it through the store.
- Branch and spec directory `2026-10-14-range-selection`, from `main`. Rebase onto the merged Phase 11 before implementing.

## Out of scope
- Stats for the selection (Phase 13).
- Selecting on the map (clicking two points), multiple selections, resizing or moving an existing brush.
- Fitting the map to the selection.
- Touch-brush polish such as long-press or page-scroll conflicts (Phase 15). A basic one-finger drag brush is in scope.

## API
```ts
// src/ui/view/viewStore.ts (ViewState and ViewStore gain)
interface ViewState {
  hover: Hover | null
  zoom: PointRange | null
  /** Inclusive point indices, at least 2 points; null = nothing selected. */
  selection: PointRange | null
}
interface ViewStore {
  // …existing
  /** Coalesced per animation frame. A range of fewer than 2 points is stored as null. */
  setSelection(selection: PointRange | null): void
}

// src/ui/charts/brushOption.ts (pure)
/** Brush component: lineX on x-axis 0, single mode, no toolbox shown. */
function buildBrush(): ChartOption['brush']

// src/ui/map/selectionLayers.ts
/** One polyline per segment part inside the range, on an SVG renderer, with class `track-selection`. */
function createSelectionLayers(track: Track, range: PointRange): L.LayerGroup
```
`rangeToX` / `xToRange` (Phase 11) convert between the brush's axis values and point ranges.

## Behavior
| Situation | Result |
|---|---|
| Drag across a chart's plot area | A `lineX` brush is drawn. `selection` updates live while dragging (per frame). The other chart shows the same brush, and the map highlight follows |
| Release | The selection stays |
| New drag | Replaces the selection (single mode) |
| Brush covering fewer than 2 points (a click or tiny drag) | Clears the selection |
| Click "Clear selection" or press Esc | `selection = null`. Brushes removed from both charts, the map highlight removed, and the track back to full opacity |
| Click "Zoom to selection" | `zoom = selection`. The brush stays and fills the view |
| Selection partly or fully outside the zoom window | The brush is clipped or not visible; the map highlight still shows the whole selection |
| X-axis toggle / speed↔pace switch | The selection is kept and redrawn in the new units |
| Time axis: brush spanning the segment pause | Selects the points on both sides; the map highlight shows one line per segment |
| Distance axis on an untimed track (`no-ele-time.gpx`) | Both charts are empty, so there's nothing to brush. The selection stays `null` |
| Hover while a selection exists | Works as in Phase 10 |
| New track loaded | Fresh store: `selection` is `null` |

## UI
- **Brush:** a translucent amber band (`rgba(245, 158, 11, 0.2)`) with a thin border, the full plot height, on both charts. It is triggered by plain drag through `takeGlobalCursor`; the ECharts toolbox stays hidden.
- **Map:** the selection overlay is `#ea580c`, weight 5, on an SVG renderer (`className: 'track-selection'`) above the canvas track. While a selection exists, the base track drops to 0.35 opacity and the start/finish markers stay fully opaque. The map view doesn't change.
- **Toolbar (Phase 11's `ChartToolbar`):** X axis toggle, "Reset zoom", "Zoom to selection", "Clear selection". The last two are disabled while there is no selection. All are at least 44 × 44 px, and the row wraps on narrow screens.
- **Esc:** clears the selection unless focus is in a text input.
- No horizontal page scroll at 375 px.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Map look | Contrasting overlay, rest dimmed, map not moved | User choice; makes the segment pop without moving the view the user set |
| Auto-zoom | None; a "Zoom to selection" button | User choice; brushing and zooming stay independent and predictable |
| Selection state | Inclusive point-index range, at least 2 points | techstack.md: index-based single source of truth. A 1-point range has no distance or duration |
| Live update | Per frame while dragging (store coalescing) | Roadmap Phase 13: stats update live. The map highlight follows the finger |
| Overlay renderer | SVG with a class, base track stays canvas | The highlight sits above the track and is testable in Playwright; the big base track stays fast |
| Clearing | Button + Esc; a click without drag also clears | Discoverable, keyboard-accessible, and matches the common chart-brush habit |
| Brush mode | `lineX`, single | Selecting is about a stretch of the track, not a y-range |
| Files | `brushOption.ts`, `useChartBrush.ts` in `src/ui/charts/`; `selectionLayers.ts`, `useSelectionOverlay.ts` in `src/ui/map/` | Small focused modules; components stay under ~200 lines |

## Context
- Phase 10: the view store with `hover`, per-frame coalescing, the `source` convention, and the ECharts and Leaflet mocks extended for events and markers.
- Phase 11: `PointRange`, `zoom`, `rangeToX` / `xToRange`, `ChartToolbar` with "Reset zoom", `DataZoomComponent`. Drag on the plot area is unbound.
- `src/ui/map/trackLayers.ts`: base polylines (`#1d4ed8`, weight 4, non-interactive) and start/finish circle markers in one layer group, on the map's canvas renderer (`preferCanvas: true`).
- `src/ui/charts/echarts.ts` must register `BrushComponent` (plus `ToolboxComponent` only if `takeGlobalCursor` needs it, kept hidden).

## Known limitations
- On phones, a one-finger drag on a chart brushes instead of scrolling the page. Phase 15 handles touch gestures.
- An existing brush can't be moved or resized; you draw a new one.
- Two charts mean two brush bands; brushing on either one selects.
