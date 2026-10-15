# Requirements – Phase 13: Selection stats

## Scope
From `specs/roadmap.md` Phase 13: stats for the selection (or the whole track if none), reusing the Phase 9 stat functions, and updating live as the selection changes.

Decided with the user:
- **Placement:** the existing summary panel switches to the selection while one exists, and shows the whole track otherwise. Same layout and labels either way.
- **Stat set:** the same as the Phase 9 summary: Distance, Duration, Elevation gain, Avg speed, Max speed, **Avg HR**. Avg pace and Elevation loss are **not** shown (roadmap line updated to match).
- **One range function:** `getRangeStats(track, series, range)` serves both. The whole track is just the full range, so the summary and the selection share one code path.
- Branch and spec directory `2026-10-14-selection-stats`, from `main`. Rebase onto the merged Phase 12 before implementing.

## Out of scope
- Showing avg pace, elevation loss or moving time (the data stays computed).
- Max HR, cadence (Phase 14). Metric/imperial (Phase 15).
- Treating the zoom window as a selection: zoom only changes the view.
- Comparing selection to whole track side by side.

## API
```ts
// src/metrics/segments.ts
/** Inclusive point indices [first, last]. Moved here from the UI store, which re-exports it. */
type PointRange = [first: number, last: number]

// src/metrics/rangeStats.ts (TrackTotals moves here from trackMetrics.ts, unchanged)

/** Derived series, indexed like track.points (TrackMetrics minus totals). */
interface TrackSeries {
  distance: number[]
  elapsed: (number | null)[]
  speed: (number | null)[]
  pace: (number | null)[]
  /** true for points inside an ignored GPS settle window (Phase 9 Amendment A), computed on the whole track. */
  settleIgnored: boolean[]
}

/** Totals for points first..last (rules in Behavior). The whole track is [0, n - 1]. */
function getRangeStats(track: Track, series: TrackSeries, range: PointRange): TrackTotals

// src/metrics/trackMetrics.ts
interface TrackMetrics extends TrackSeries {
  totals: TrackTotals // = getRangeStats(track, series, [0, n - 1]); zeros/nulls for an empty track
}

// Phase 9 functions gain an optional trailing range (default: whole track), same results without it:
function getMovingStats(track, distance, elapsed, speed, range?: PointRange): MovingStats | null
function getAverageHeartRate(track, elapsed, range?: PointRange): number | null
function getElevationChange(track, threshold = 3, range?: PointRange): ElevationChange | null
// maxSpeed.ts: the ignored-points mask becomes reusable
function getSettleIgnored(track, elapsed, speed): boolean[]
function getMaxSpeedInRange(speed, settleIgnored, range: PointRange): number | null
// getMaxSpeed(track, elapsed, speed) stays, built on the two above.

// src/ui/view (hook)
/** Totals for the current selection, or the whole-track totals when there is none. */
function useDisplayedStats(track: Track, metrics: TrackMetrics): {
  totals: TrackTotals
  selection: PointRange | null
}
```
`getSegmentRanges` gains a helper `clipSegmentRanges(track, range)` returning `[start, end)` parts of each segment inside the range. All interval rules then work on those parts.

## Behavior
| Stat | Rule for range [a, b] |
|---|---|
| Distance | `distance[b] − distance[a]`; segment gaps inside the range add nothing (as today) |
| Duration | Elapsed of the last timed point in range − the first timed point in range (pauses included, like the whole track); `null` with no timed point |
| Elevation gain | Hysteresis (3 m) run over the range only, anchored at its first point with elevation; `null` with no elevation in range |
| Moving time / Avg speed | Phase 9 interval rule on intervals whose **both** points are in the range; avg speed `null` when moving time is 0 |
| Max speed | Largest speed in range outside the **whole-track** settle mask; plain max in range if all ignored; `null` with no speed |
| Avg HR | Phase 9 time-weighted rule on intervals inside the range; plain mean of HR in range as fallback; `null` without HR |
| Elevation loss | Computed the same way as gain (kept in `TrackTotals`, not shown) |

| Situation | Result |
|---|---|
| No selection | Summary shows `metrics.totals` (whole track), exactly as Phase 9 |
| Selection exists | Summary shows `getRangeStats` for it; recomputed per frame while brushing (store coalescing) |
| Selection cleared (button, Esc, link) | Back to the whole-track stats |
| Selection on an untimed track | Distance and elevation gain only, the same null rules as the whole track |
| Full-range selection | Identical to the whole-track totals |
| New track | No selection, whole-track stats |

## UI
- Header unchanged: the track name `<h2>` and the muted file name.
- **While a selection exists**, a line under the header reads "Selection · 1.20 km – 3.45 km" (start and end distances via `formatDistance`), followed by a "Show whole track" text button that clears the selection. Without a selection, the line is absent.
- Stats `dl`: the same labels, order and formatting as Phase 9. `aria-label` is "Whole-track stats" or "Selection stats". It is not `aria-live`, so a brush drag doesn't flood screen readers.
- Badges unchanged. No horizontal page scroll at 375 px, including the selection line (it wraps).

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Placement | Summary switches to the selection | User choice; matches the roadmap "selection (or whole track if none)"; no extra panel on phones |
| Stat set | Phase 9 set (incl. Avg HR); no pace, no elevation loss | User choice; consistent with the Phase 9 summary decisions |
| One code path | `getTrackMetrics` totals = `getRangeStats` on the full range | User choice; the summary and selection can't drift apart |
| Max speed mask | Computed once on the whole track, sliced per range | A range start is not a GPS restart; recomputing per range would flag real starts of a selection as settle windows |
| Elevation in a range | Hysteresis restarts at the range | Self-contained and simple. Not additive across ranges (see limitations) |
| Interval rules | Only intervals with both points inside the range | Same rule family as Phase 9; adjacent ranges sharing a point add up for distance, duration and moving time |
| Live updates | Per frame, `getRangeStats` linear in the range | 100 000 points take ~5 ms; no prefix-sum cache needed yet |
| `PointRange` home | `src/metrics/segments.ts` (UI re-exports) | Metrics can't import UI; the type belongs to the data layer, next to `clipSegmentRanges` |
| Files | `src/metrics/rangeStats.ts`, `useDisplayedStats` in `src/ui/view/` | Small focused modules |
| Who calls the hook | `TrackSummary` (gets `metrics` instead of `totals`) | Only the summary re-renders while brushing; `App` stays untouched |

## Reference values
Computed in plan task group 1 with an independent script (regex GPX parsing, brute force, not the app code) using the rules above, and recorded here before any app code changed. Its full-range values match the Phase 9 table. Ranges are inclusive point indices:

| File | Range | Distance | Duration | Elev. gain | Avg speed | Max speed | Avg HR |
|---|---|---:|---:|---:|---:|---:|---:|
| `run.gpx` | [30, 119] | 844.24 m | 359 s | 3 m | 8.47 km/h | 13.60 km/h | 149.78 bpm |
| `bike.gpx` | [50, 149] (spans the pause at 100) | 1141.70 m | 433 s | 12 m | 17.18 km/h | 33.73 km/h | 157.42 bpm |
| `no-ele-time.gpx` | [10, 59] | 1152.26 m | – | – | – | – | – |
| kayak (`GpxFiles/kayak_24664631302.gpx`) | [0, 999] (contains the settle spike) | 2220.22 m | 1031 s | 0 m | 7.75 km/h | 9.60 km/h | 112.22 bpm |
| bike (`GpxFiles/bike_24025393290.gpx`) | [500, 1499] | 14700.40 m | 2877 s | 66 m | 19.15 km/h | 33.28 km/h | 148.60 bpm |
| run (`GpxFiles/run_24545718755.gpx`) | [100, 399] | 3276.10 m | 1322 s | 3 m | 8.92 km/h | 13.70 km/h | 146.38 bpm |

Shown in the summary: `run.gpx` [30, 119] "844 m", "5:59", "3 m", "8.5 km/h", "13.6 km/h", "150 bpm"; `bike.gpx` [50, 149] "1.14 km", "7:13", "12 m", "17.2 km/h", "33.7 km/h", "157 bpm".

Additivity check (same script): `bike.gpx` [0, 100] + [100, 199] = 1074.65 + 1444.50 m, 478 + 239 s duration, 278 + 239 s moving time, matching the whole track (2519.15 m, 717 s, 517 s). Exact gains: `run.gpx` [30, 119] 3.0 m; `bike.gpx` [50, 149] 12.4 m.

`GpxFiles/` is git-ignored: those rows are for manual checks only.

## Invariants (unit-tested)
- `getRangeStats(track, series, [0, n − 1])` equals `metrics.totals` for every fixture and the 100 000-point track.
- For adjacent ranges [a, m] and [m, b]: distance, duration (when a, m and b are timed) and moving time add up exactly to [a, b].
- Max speed of [a, b] = max of the two halves' max speeds (no plain-max fallback involved).

## Context
- Phase 9: `getMovingStats`, `getAverageHeartRate`, `getMaxSpeed` (settle filter), `getElevationChange`, `TrackTotals`, `TrackSummary` with the stat list and `orNull`.
- Phase 12: `selection` in the view store (inclusive, at least 2 points), cleared by button or Esc, updated per frame.
- Fixtures: `run.gpx` 150 points; `bike.gpx` 200 points, second segment at index 100 (177 s pause); `no-ele-time.gpx` 80 points.

## Known limitations
- Elevation gain is not additive: the gains of two halves can differ from the gain of the whole by up to the 3 m threshold per split, because the hysteresis restarts at each range.
- A selection starting right after a GPS settle window inherits the whole-track mask, so a real spike at the selection's start that wasn't a settle stays counted (as on the whole track).
