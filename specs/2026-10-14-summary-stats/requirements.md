# Requirements – Phase 9: Summary stats

## Scope
From `specs/roadmap.md` Phase 9 (inserted after Phase 8; later phases moved down by one):
- Track name as the summary heading, with the file name beside it.
- "Points" and "Elevation loss" removed from the summary.
- Avg speed, Max speed and Avg HR added to the summary.
- Unit tests.

Decided with the user:
- **Heading:** the track name is the bold heading; the file name follows it in smaller, muted text. Without a track name, the file name is the heading.
- **Avg speed:** moving average, i.e. distance while moving ÷ time while moving, using the existing stopped threshold (0.5 m/s).
- **Max speed:** the highest value of the existing 5 s smoothed speed series.
- **Avg HR:** time-weighted; plain mean when the track has no usable times.
- New phase with its own spec; the Phase 4 and Phase 6 specs carry a note pointing here.

## Out of scope
- Selection stats (Phase 13): the same functions will later run on the selected range.
- Max HR, cadence stats (Phase 14); avg pace in the summary (Phase 13).
- Showing moving time; metric/imperial toggle (Phase 15).
- GPS spike filtering for max speed beyond the existing 5 s window (see Known limitations).
- Removing `elevationLoss` or the point count from the data: only the summary stops showing them.

## API
```ts
// src/metrics/movement.ts
interface MovingStats {
  time: number // seconds, >= 0
  distance: number // meters, >= 0
}
/**
 * Time and distance while moving. An interval between consecutive timed points of the same
 * segment counts as moving when the later point's speed is >= STOPPED_SPEED.
 * Null when the track has no time.
 */
function getMovingStats(
  track: Track,
  distance: number[],
  elapsed: (number | null)[],
  speed: (number | null)[],
): MovingStats | null

// src/metrics/heartRate.ts
/**
 * Time-weighted average heart rate in bpm. Each HR sample counts for the time until the next
 * timed point of its segment. Plain mean of all HR samples when no such interval exists.
 * Null when no point has HR.
 */
function getAverageHeartRate(track: Track, elapsed: (number | null)[]): number | null

// src/metrics/trackMetrics.ts (TrackTotals gains)
interface TrackTotals {
  // …existing: distance, duration, elevationGain, elevationLoss
  movingTime: number | null // seconds
  avgSpeed: number | null // m/s, moving distance / moving time
  maxSpeed: number | null // m/s, max of the speed series
  avgHeartRate: number | null // bpm
}

// src/ui/format.ts (added)
function formatHeartRate(bpm: number): string // "144 bpm"
```
New functions are re-exported from `src/metrics/index.ts`.

## Behavior
| Situation | Result |
|---|---|
| Track with time | `movingTime` = sum of moving intervals; `avgSpeed` = moving distance / `movingTime` |
| Stopped intervals (later point's speed < 0.5 m/s) | Excluded from both moving time and moving distance (GPS drift while stopped doesn't count) |
| Pause between segments | Never counted: intervals don't cross segment boundaries |
| Moving time is 0 (never moving) | `movingTime: 0`, `avgSpeed: null` |
| Track without time | `movingTime`, `avgSpeed`, `maxSpeed` `null` |
| Speed series has values | `maxSpeed` = largest non-null value |
| HR present, times present | Each interval between consecutive timed points of one segment adds `hr(earlier point) × Δt`; average = sum / total weighted time. Points without HR start no interval |
| HR present, no usable intervals (no time, or Δt all 0) | Plain mean of all HR samples |
| No HR | `avgHeartRate: null` |
| Empty track | All new totals `null` |

## UI
- **Header row:** `<h2>` with the track name; next to it, the file name in a muted, smaller `<p>` on the same baseline, wrapping below on narrow screens (`flex-wrap`), `overflow-wrap: anywhere`. Without a track name: `<h2>` with the file name and no second element.
- **Stats (`dt`/`dd` pairs), in this order:** Distance, Duration, Elevation gain, Avg speed, Max speed, Avg HR. Each one is hidden when its value is `null`. "Track", "Points" and "Elevation loss" are no longer shown.
- **Formatting:** Avg speed and Max speed use `formatSpeed` ("17.5 km/h"); Avg HR uses `formatHeartRate`, whole bpm ("156 bpm").
- Badges for available data are unchanged.
- No horizontal page scroll at a 375 px viewport (mission principle 5).

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Heading | Track name, then muted file name; file name alone when unnamed | User choice; the activity name is what people recognise |
| Avg speed | Moving average with the 0.5 m/s threshold | User choice; matches Garmin/Strava; reuses the Phase 6 threshold |
| Moving interval rule | Later point's smoothed speed ≥ 0.5 m/s | Smoothed speed ignores the 1–2 m GPS drift that raw point-to-point speed would count as movement |
| Moving distance | Distance over moving intervals only (not total distance) | Consistent numerator and denominator |
| Max speed | Max of the 5 s smoothed series | Reuses Phase 6; raw point-to-point max would be dominated by GPS spikes |
| Avg HR | Time-weighted, plain-mean fallback | User choice; uneven recording intervals don't skew it |
| HR across segment gaps | Excluded | Same rule as distance and speed: a pause is not recorded activity |
| Elevation loss / points | Hidden in the UI only; still computed/available | Phase 13 selection stats still need loss |
| Labels | Sentence case ("Avg speed", "Max speed", "Avg HR") | Matches existing "Elevation gain" |
| Files | `movement.ts`, `heartRate.ts` in `src/metrics/` | Small, focused modules next to `speed.ts` |
| Branch / directory | Branch `2026-10-14-summary-stats`; directory `2026-10-14-summary-stats` | Spec naming convention `yyyy-mm-dd-feature-name` |

## Reference values
Computed with an independent script (regex GPX parsing, brute-force windows; not the app code), using the rules above:

| Fixture | Moving time | Avg speed | Max speed | Avg HR (time-weighted) |
|---|---:|---:|---:|---:|
| `run.gpx` | 644 s | 8.21 km/h | 13.60 km/h | 143.82 bpm |
| `bike.gpx` | 517 s | 17.48 km/h | 33.73 km/h | 155.95 bpm |
| `no-ele-time.gpx` | – | – | – | – |

Shown in the summary: `run.gpx` "8.2 km/h", "13.6 km/h", "144 bpm"; `bike.gpx` "17.5 km/h", "33.7 km/h", "156 bpm".

Real files in `GpxFiles/` (git-ignored, manual checks only): bike 19.26 / 41.93 km/h / 147.11 bpm; kayak 7.98 / 20.47 km/h / 108.23 bpm; run 9.01 / 15.70 km/h / 145.25 bpm.

## Known limitations
- **Max speed and GPS spikes:** a spike longer than the 5 s window still raises max speed. The kayak file shows 20.5 km/h, from a GPS-lock spike in the first seconds (typical speed ~8 km/h). Spike filtering is a post-MVP candidate.
- **Recording gaps inside a segment:** a long gap inside one segment (no auto-pause split) weights the HR sample before it by the whole gap.

## Context
- `specs/mission.md`: private, in-browser; fast on large tracks; mobile-friendly; small steps.
- `specs/techstack.md`: pure, unit-tested metrics; SI units, formatting only in the UI; components under ~200 lines.
- Phase 6 provides `getTrackMetrics` (computed once in `App`) with `distance`, `elapsed`, `speed` (5 s window), `pace`, `STOPPED_SPEED = 0.5` and `TrackTotals`; `src/ui/format.ts` has `formatSpeed`.
- `TrackSummary` (Phases 4 and 6) currently shows the file name heading, Track, Points, Distance, Duration, Elevation gain, Elevation loss, plus badges.
- Fixtures: `run.gpx` (HR on every point, "Run fixture"), `bike.gpx` (HR, two segments with a 177 s pause, "Bike fixture"), `no-ele-time.gpx` (no time/HR, "No elevation or time fixture"). All fixtures have a track name.
