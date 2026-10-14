# Requirements – Phase 6: Derived metrics

## Scope
From `specs/roadmap.md` Phase 6:
- Cumulative distance (haversine).
- Speed and pace series.
- Elevation gain/loss with noise threshold.
- Unit tests.

Also included (decided with the user):
- Totals (distance, duration, elevation gain/loss) shown in the existing `TrackSummary`, so the phase can be checked in the app.
- A "stopped" speed threshold (0.5 m/s) below which pace is `null`. It was decided together with the Phase 8 chart behavior, but the pace series belongs here.

## Out of scope
- Charts (Phases 7–8), selection stats and avg/max speed (Phase 13), HR/cadence stats (Phase 14).
  > **Superseded by Phase 9 (`specs/2026-10-14-summary-stats`):** whole-track avg/max speed and avg HR are added there.
- Metric/imperial toggle (Phase 15). Totals are shown in metric only.
- Moving vs stopped time, splits, per-sport smoothing or thresholds (post-MVP).
- Elevation smoothing beyond the hysteresis threshold, and DEM/terrain correction.
- Shared state via context/Zustand (Phase 10).

## API
```ts
// src/metrics/distance.ts
/** Great-circle distance in meters (haversine, mean Earth radius 6 371 008.8 m). */
function haversineDistance(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number

/** Cumulative distance in meters per point. A segment's first point repeats the previous value (gaps are skipped). */
function getCumulativeDistance(track: Track): number[]

// src/metrics/speed.ts
/** Speed below which a point counts as stopped, in m/s. */
const STOPPED_SPEED = 0.5

/** Seconds since the first point that has a time; null for points without time. */
function getElapsedTime(track: Track): (number | null)[]

/** Speed in m/s per point, over a centred time window inside the point's segment. */
function getSpeedSeries(
  track: Track,
  distance: number[],
  elapsed: (number | null)[],
  windowSeconds?: number, // default 5
): (number | null)[]

/** Pace in s/m per point (1 / speed); null when speed is null or below STOPPED_SPEED. */
function getPaceSeries(speed: (number | null)[]): (number | null)[]

// src/metrics/elevation.ts
interface ElevationChange {
  gain: number // meters, >= 0
  loss: number // meters, >= 0
}
/** Gain/loss with hysteresis; null when no point has elevation. */
function getElevationChange(track: Track, threshold?: number /* default 3 */): ElevationChange | null

// src/metrics/trackMetrics.ts
interface TrackTotals {
  distance: number // meters
  duration: number | null // seconds, last timed point minus first timed point (pauses included)
  elevationGain: number | null // meters
  elevationLoss: number | null // meters
}

/** All derived series are indexed like `track.points`. */
interface TrackMetrics {
  distance: number[]
  elapsed: (number | null)[]
  speed: (number | null)[]
  pace: (number | null)[]
  totals: TrackTotals
}

function getTrackMetrics(track: Track): TrackMetrics
```
All new functions and types are re-exported from `src/metrics/index.ts`.

## Behavior
| Situation | Result |
|---|---|
| Two consecutive points in one segment | Distance grows by their haversine distance |
| First point of a later segment | Same cumulative distance as the last point of the previous segment (gap not counted) |
| Track with no points | All series empty; totals `distance: 0`, `duration`/`elevationGain`/`elevationLoss` `null` |
| Track without any time | `elapsed`, `speed`, `pace` all `null`; `duration` `null` |
| Point without time in a timed track | `elapsed`, `speed`, `pace` `null` for that point |
| Speed at point *i* | Window = points in the same segment whose elapsed time lies in `[tᵢ − w/2, tᵢ + w/2]` (w = 5 s); speed = Δdistance / Δtime between the first and last point of the window |
| Window contains only point *i* (sparse recording) | Use its direct neighbours inside the segment instead |
| Single-point segment, or Δtime ≤ 0 | Speed `null` |
| Speed ≥ 0.5 m/s | Pace = 1 / speed (s/m) |
| Speed < 0.5 m/s (stopped) | Speed as computed (0 when not moving); pace `null` |
| Elevation hysteresis | Anchor = first elevation. For each later elevation `e`: if `e − anchor ≥ 3` add to gain and move the anchor to `e`; if `anchor − e ≥ 3` add to loss and move the anchor; otherwise ignore. Runs across segment boundaries (the climb during a pause is real) and skips points without elevation |
| ±1–2 m noise around a flat line | Gain and loss stay 0 |
| Track with no elevation | `getElevationChange` returns `null`; totals gain/loss `null` |

## UI
> **Superseded by Phase 9 (`specs/2026-10-14-summary-stats`):** "Points" and "Elevation loss" are no longer shown in the summary (loss stays in `TrackTotals`); Avg speed, Max speed and Avg HR are added.

`TrackSummary` gets a `totals: TrackTotals` prop and shows, after "Points":
- **Distance** – always. Under 1 km: whole meters ("850 m"); otherwise km with 2 decimals ("2.52 km").
- **Duration** – only when `duration` is not `null`. `m:ss` under one hour ("10:44"), else `h:mm:ss` ("1:02:03").
- **Elevation gain** / **Elevation loss** – only when not `null`; whole meters ("22 m").

Formatting lives in `src/ui/format.ts` (`formatDistance`, `formatDuration`, `formatElevation`), pure and unit-tested. Number formatting uses `toLocaleString` like the point count, with fixed decimals.

`App` computes `getTrackMetrics(loaded.track)` once with `useMemo` and passes `metrics.totals` to `TrackSummary`. The charts in Phases 7–8 will reuse the same `metrics` object.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Distance formula | Haversine, R = 6 371 008.8 m (IUGG mean radius) | Roadmap choice; accurate to well under 0.5% for track-scale distances |
| Segment gaps | Not counted in distance; speed window never crosses a segment boundary | Same as the map, which draws no line across gaps; a pause jump is not real movement |
| Elevation noise | Hysteresis, 3 m default, threshold as an optional parameter | Simple, close to device totals for barometric data; the parameter lets post-MVP per-sport defaults tune it |
| Elevation across segments | Hysteresis continues across boundaries | The elevation change during a pause still happened |
| Speed smoothing | Centred 5 s time window, neighbours as fallback | Robust to uneven sampling (1 s vs smart recording) while keeping short sprints/gusts |
| Stopped threshold | 0.5 m/s, pace `null` below it | Pace would otherwise spike towards infinity at stops |
| Units | Meters, seconds, m/s, s/m | SI in metrics; formatting only in the UI (techstack conventions) |
| Series type | Plain `number[]` / `(number \| null)[]` indexed like `track.points` | Single source of truth by point index; feeds ECharts directly |
| Complexity | O(n) per series (two-pointer speed window) | Tens of thousands of points must stay fast (mission principle 4) |
| Duration | Last minus first timed point, pauses included | Matches the elapsed-time x-axis chosen for Phase 8; moving time is post-MVP |
| Files | `distance.ts`, `speed.ts`, `elevation.ts`, `trackMetrics.ts` in `src/metrics/` | Small, focused modules next to `fields.ts` and `geometry.ts` |
| Branch / directory | Branch `2026-10-14-metrics-and-charts` (shared with Phases 7–8); directory `2026-10-14-derived-metrics` | Spec naming convention `yyyy-mm-dd-feature-name`; the user asked for one branch for the three phases |

## Reference values
Computed with an independent script (not the app code), using the rules above:

| Fixture | Distance | Duration | Gain | Loss |
|---|---:|---:|---:|---:|
| `run.gpx` | 1469.0 m | 644 s | 6.0 m | 3.2 m |
| `bike.gpx` | 2519.1 m (699.5 m gap skipped) | 717 s | 22.4 m | 17.6 m |
| `no-ele-time.gpx` | 1721.0 m | – | – | – |

Real files in `GpxFiles/` (git-ignored, manual checks only): bike 39 390.7 m / 7731 s / ↑203.6 ↓207.4 m; kayak 9401.9 m / 4259 s / ↑0.0 ↓9.0 m; run 6292.6 m / 2523 s / ↑12.6 ↓13.0 m.

## Context
- `specs/mission.md`: private, in-browser only; fast on large tracks; small steps.
- `specs/techstack.md`: layers `parser` → `metrics` → `ui`; pure, unit-tested calculations (haversine, speed, elevation gain with threshold); SI units; derived arrays indexed by point index; components under ~200 lines.
- `Track` has `points` (lat, lon, ele?, time? in epoch ms, hr?, cad?) and `segmentStarts` (first entry 0).
- Existing metrics: `getAvailableFields` (`fields.ts`), `getSegmentLines`/`getTrackBounds` (`geometry.ts`). Lint forbids UI imports in `metrics`.
- Fixtures: `run.gpx` (150 points, 1 segment, ele/time/HR/cad), `bike.gpx` (200 points, 2 segments split at a 177 s / 700 m pause), `no-ele-time.gpx` (80 points, lat/lon only).
