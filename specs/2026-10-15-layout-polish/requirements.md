# Requirements – Phase 15: Layout and polish

## Scope
From `specs/roadmap.md` Phase 15 (usable on desktop and mobile):
- Responsive, mobile-first layout (map + charts + stats stack on narrow screens).
- Touch support: pinch/drag zoom, touch brush selection, tap-sized controls.
- Playwright checks at a phone viewport.
- Metric/imperial toggle.
- Empty, loading and error states.

Pinch zoom and one-finger brushing on the charts, 44 px toolbar buttons and the stacked single-column layout already exist (Phases 4–14). This phase fills the remaining gaps.

Decided (recommended defaults; the user asked not to be asked unless necessary):
- **Page scrolling on phones (the main touch fix).** Measured at 375 × 667: a vertical one-finger swipe over the map or any chart does **not** scroll the page, because Leaflet's drag and ECharts' brush take every touch. The map and four charts fill most of the page, so a phone user can barely scroll. Fix:
  - **Map:** on touch screens (`pointer: coarse`), one finger scrolls the page; two fingers pan and pinch-zoom the map (Leaflet `dragging: false`, touch zoom stays on). A caption under the map says so, on touch screens only.
  - **Charts:** a one-finger gesture that starts mostly vertical scrolls the page; one that starts mostly horizontal brushes, as now. Pinch still zooms. A scroll gesture leaves the selection as it was.
- **Units:** a "Units" switch (Metric / Imperial) in the page header, visible before a file is loaded. The choice is remembered in `localStorage` and defaults to Metric. It changes every distance, elevation, speed and pace: summary, selection line, chart axes and tooltips, and the map's scale bar.
- **Layout:** still one column at every width (the side-by-side layout is the post-MVP "Desktop view mode"). The column grows to 64 rem on wide screens. The map height becomes `clamp(280px, 55vh, 600px)` instead of `60vh`. After a track is loaded, the drop zone shrinks to one compact row.
- **Empty state:** before any file is loaded, an intro under the drop zone says what the app shows and that the file never leaves the device, with a **"Try a sample track"** button that loads a bundled sample (`public/sample.gpx`, a copy of the `run.gpx` fixture).
- **Loading state:** "Reading run.gpx…" with a small spinner; the drop zone and the sample button are disabled while a file is read.
- **Error state:** the alert names the file ("Couldn't open bad.gpx"), keeps the existing message, and has a "Dismiss" button. A previously loaded track stays.
- Branch and spec directory `2026-10-15-layout-polish`.

## Out of scope
- Side-by-side desktop layout (post-MVP "Desktop view mode").
- Dark mode, translations, other unit systems (nautical, m/s).
- Per-sport defaults (post-MVP).
- Phase 16's end-to-end main flow test and Phase 17's deploy.

## API
```ts
// src/ui/units/units.ts
type Units = 'metric' | 'imperial'
const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.28084
/** Meters per unit on the distance axis: 1000 (km) or 1609.344 (mi). */
function distanceUnitMeters(units: Units): number
function loadUnits(): Units // localStorage, 'metric' when missing, invalid or unavailable
function saveUnits(units: Units): void // ignores storage errors

// src/ui/units/UnitsContext.tsx
function UnitsProvider(props: { children: ReactNode }): JSX.Element // loads, persists
function useUnits(): [Units, (units: Units) => void]
function UnitsToggle(): JSX.Element // SegmentedControl "Units": Metric / Imperial

// src/ui/format.ts: optional trailing `units` (default 'metric'), metric output unchanged
formatDistance(m, units?)  // imperial: "850 ft" under 0.1 mi, else "2.52 mi"
formatElevation(m, units?) // imperial: "72 ft"
formatSpeed(mps, units?)   // imperial: "12.3 mph"
formatPace(spm, units?)    // imperial: "8:22 /mi"

// src/ui/charts/xAxis.ts: optional trailing `units` (default 'metric') on
// buildLineData, xOfPoint, rangeToX, axisExtent, buildXAxis, formatX.
// Distance-axis x values are km or mi.
// buildLineOption / buildElevationOption / buildSpeedOption / buildSensorOption and
// useChartZoom / useChartBrush / useChartHover take `units` too.

// src/ui/charts/speedOption.ts
function paceAxisRange(ys, cap = PACE_AXIS_CAP): { min; max; interval } // cap per units: 20 min/km, 30 min/mi

// src/ui/upload
function useGpxUpload(): GpxUpload // gains `loadingName: string | null`, `dismissError()`; `error` gains `fileName`
function loadSample(): Promise<File> // fetches /sample.gpx as "sample.gpx"
```

## Behavior
| Situation | Result |
|---|---|
| First visit | Metric; header switch shows Metric |
| Switch to Imperial | Summary, selection line, chart axes/tooltips and map scale switch at once; zoom, selection and hover stay on the same points |
| Reload | The last choice is restored; with storage blocked, Metric and no error |
| Phone, one-finger vertical swipe on the map or a chart | The page scrolls; the map doesn't pan; no selection is made or cleared |
| Phone, one-finger horizontal drag on a chart | Brushes a selection (Phase 12) |
| Phone, pinch on a chart / on the map | Zooms the chart / the map |
| Phone, two-finger drag on the map | Pans the map |
| Desktop (`pointer: fine`) | Map drag, wheel zoom and chart brushing unchanged |
| No file yet | Drop zone, intro text and "Try a sample track" |
| "Try a sample track" | Loads `sample.gpx` (the run fixture) like a picked file; no external request |
| Reading a file | "Reading <name>…" with a spinner; drop zone and sample button disabled |
| Bad file | Alert "Couldn't open <name>" + message + Dismiss; any loaded track stays |
| Dismiss | The alert disappears; nothing else changes |
| Track loaded | The drop zone is a compact row: "Drop another GPX file here or Choose file" |

## UI
- **Header:** `<header>` with the title and the Units switch on one row, wrapping on narrow screens.
- **Every tappable control is at least 44 × 44 px** at a 375 px viewport, including Leaflet's zoom buttons (enlarged from 30 px). Leaflet's attribution links are exempt (map provider text).
- **No horizontal page scroll** at 375 px in the empty, loading, error, loaded and selection states.
- 16 px side gutter on phones (unchanged).
- The touch caption under the map: "Use two fingers to move or zoom the map." (muted, small), only with `pointer: coarse`.
- Units labels: distance "km"/"m" or "mi"/"ft"; elevation "m"/"ft"; speed "km/h"/"mph"; pace "/km"/"/mi". HR and cadence unchanged.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Map touch | One finger scrolls, two fingers move/zoom (touch screens only) | Standard "cooperative gestures" of embedded maps; no new dependency (Leaflet `dragging: false` + its own `touch-action: pan-x pan-y`) |
| Chart touch | Direction of the first ~10 px decides: vertical scrolls, horizontal brushes | Keeps Phase 12 brushing; reuses the pinch path in `useChartBrush` (brush off for the gesture, selection restored) |
| Letting the page scroll | A capture-phase listener makes the touch's `preventDefault` a no-op while the gesture is undecided or scrolling; `touch-action: pan-y` on the chart | ECharts' brush cancels `touchstart`, which blocks scrolling for the whole gesture |
| Units default | Metric, remembered | Deterministic; most users of the target sports outside the US use metric |
| Units storage | `localStorage`, wrapped in try/catch | Per-viewer preference; must not break when storage is blocked |
| Distance axis in imperial | x values in miles (data rebuilt) | Round tick values ("1 mi"); converting labels only would give "0.62 mi" ticks |
| Imperial short distances | Feet under 0.1 mi | Matches common apps; "0.03 mi" is hard to read |
| Pace cap | 20 min/km, 30 min/mi | Same idea as Phase 8; 30 divides by every pace step |
| Sample track | `public/sample.gpx` = `run.gpx` fixture | Has every field (elevation, time, HR, cadence); small; same origin, so still private and offline-safe |
| Map height | `clamp(280px, 55vh, 600px)` | 60vh was huge on tall screens and pushed the charts away |
| Column width | 48 rem phones/tablets, 64 rem ≥ 1024 px | More chart resolution on desktop without the post-MVP layout |
| Toggle component | `SegmentedControl` moves to `src/ui/common/` | Now used by the header too, not only charts |

## Context
- Phase 12 `useChartBrush` already switches the brush off for a pinch and restores the selection afterwards.
- Phase 4 upload: `useGpxUpload`, `FileDropZone` (with an unused `disabled` prop), `loadGpxFile` error messages.
- Phase 5 map: `useLeafletMap` creates the map and a metric-only scale control.
- `format.ts` is the only place converting units (tech stack convention); metrics stay SI.
- E2E: `stubExternalRequests` aborts non-localhost requests, so the sample must be same-origin.

## Known limitations
- A diagonal swipe on a chart is decided by its first ~10 px; a mostly horizontal start brushes even if the finger then goes vertical.
- Hybrid devices whose primary pointer is fine (touch laptops) keep one-finger map dragging on the touch screen.
