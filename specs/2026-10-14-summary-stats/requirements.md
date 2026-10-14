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
- **Max speed:** the highest value of the existing 5 s smoothed speed series, ignoring GPS settle spikes (see Amendment A below).
- **Avg HR:** time-weighted; plain mean when the track has no usable times.
- New phase with its own spec; the Phase 4 and Phase 6 specs carry a note pointing here.
- **Amendment A (2026-10-14):** a settle-window filter keeps GPS start-up spikes out of max speed.

## Out of scope
- Selection stats (Phase 13): the same functions will later run on the selected range.
- Max HR, cadence stats (Phase 14); avg pace in the summary (Phase 13).
- Showing moving time; metric/imperial toggle (Phase 15).
- GPS spike filtering beyond Amendment A: mid-track jumps that don't follow a recording gap, and filtering the speed chart (see Known limitations).
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

// src/metrics/maxSpeed.ts (Amendment A)
/**
 * Largest smoothed speed in m/s, ignoring GPS settle spikes (rule in Amendment A).
 * Null when the speed series has no values.
 */
function getMaxSpeed(track: Track, elapsed: (number | null)[], speed: (number | null)[]): number | null

// src/metrics/trackMetrics.ts (TrackTotals gains)
interface TrackTotals {
  // …existing: distance, duration, elevationGain, elevationLoss
  movingTime: number | null // seconds
  avgSpeed: number | null // m/s, moving distance / moving time
  maxSpeed: number | null // m/s, getMaxSpeed (settle spikes ignored)
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
| Speed series has values | `maxSpeed` = largest non-null value outside ignored settle windows (Amendment A) |
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
| Max speed | Max of the 5 s smoothed series, settle spikes ignored | Reuses Phase 6; raw point-to-point max would be dominated by GPS spikes; Amendment A removes start-up spikes the 5 s window can't |
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

Max speeds are unchanged by Amendment A: neither fixture has a settle spike.

Shown in the summary: `run.gpx` "8.2 km/h", "13.6 km/h", "144 bpm"; `bike.gpx` "17.5 km/h", "33.7 km/h", "156 bpm".

Real files in `GpxFiles/` (git-ignored, manual checks only): bike 19.26 / 41.93 km/h / 147.11 bpm; kayak 7.98 / **10.57** km/h / 108.23 bpm (20.47 km/h before Amendment A); run 9.01 / 15.70 km/h / 145.25 bpm.

## Known limitations
- **Mid-track GPS jumps:** Amendment A only looks at the first 10 s after a segment start or a recording gap. A jump in the middle of continuous recording still raises max speed. Filtering the whole track would also flatten real 5–10 s sprints (tested: 16 → 12 km/h), so this is left to the post-MVP "top speed over N seconds".
- **Bursts inside a spiky settle window:** a real burst that starts and ends within the first 10 s, right after a spike, is ignored.
- **Speed chart:** unfiltered on purpose, so the spike stays visible; the chart's peak can be higher than the summary's Max speed.
- **Recording gaps inside a segment:** a long gap inside one segment (no auto-pause split) weights the HR sample before it by the whole gap.

## Context
- `specs/mission.md`: private, in-browser; fast on large tracks; mobile-friendly; small steps.
- `specs/techstack.md`: pure, unit-tested metrics; SI units, formatting only in the UI; components under ~200 lines.
- Phase 6 provides `getTrackMetrics` (computed once in `App`) with `distance`, `elapsed`, `speed` (5 s window), `pace`, `STOPPED_SPEED = 0.5` and `TrackTotals`; `src/ui/format.ts` has `formatSpeed`.
- `TrackSummary` (Phases 4 and 6) currently shows the file name heading, Track, Points, Distance, Duration, Elevation gain, Elevation loss, plus badges.
- Fixtures: `run.gpx` (HR on every point, "Run fixture"), `bike.gpx` (HR, two segments with a 177 s pause, "Bike fixture"), `no-ele-time.gpx` (no time/HR, "No elevation or time fixture"). All fixtures have a track name.

## Amendment A – GPS settle filter for max speed
Added 2026-10-14 on branch `2026-10-14-max-speed-settle`, after Phase 9 was merged. Replaces the former known limitation "Max speed and GPS spikes".

### Problem
When recording starts, or the GPS reconnects after a gap, the first fixes can be off by tens of meters and converge over a few seconds. The 5 s smoothed speed then starts high and decays. In the kayak file it goes 20.5 → 17.4 → 13.5 → 12.3 → 11.7 km/h over the first 5 s, against a typical ~8 km/h and a real peak of 10.6 km/h. This is a decay over several fixes, not one stray point, so single-point outlier filters don't catch it. The files carry no accuracy data (`hdop`, satellites, device speed), so the rule uses only positions and times.

### Rule
Constants in `src/metrics/maxSpeed.ts`:

| Constant | Value | Meaning |
|---|---:|---|
| `SETTLE_SECONDS` | 10 | Length of a settle window |
| `SETTLE_GAP_SECONDS` | 10 | A time gap longer than this inside a segment starts a new settle window |
| `SETTLE_REFERENCE_SECONDS` | 60 | Length of the reference window used to judge a spike |
| `SPIKE_SIGMAS` | 3 | How far above the reference median a spike must be, in robust standard deviations |
| `MIN_SPEED_SPREAD` | 0.5 m/s | Floor for the robust standard deviation, so a very steady reference doesn't flag small variations |

1. **Settle starts:** within each segment, the first timed point, and every timed point more than `SETTLE_GAP_SECONDS` after the previous timed point.
2. **Settle window:** the timed points of the same segment with elapsed time in [start, start + `SETTLE_SECONDS`].
3. **Reference:** the non-null speeds of the same segment with elapsed time in [start, start + `SETTLE_REFERENCE_SECONDS`]. Compute their median and a robust σ = max(1.4826 × MAD, `MIN_SPEED_SPREAD`).
4. **Spike:** a speed in the settle window more than `SPIKE_SIGMAS` × σ above the reference median. Only too-fast values count; a slow start never triggers it.
5. **Ignore:** when a settle window contains a spike, all of its points are ignored for max speed. The whole window goes, not just the flagged points, because the decaying tail (e.g. 12.3, 11.7 km/h) is under the threshold but still part of the spike.
6. **Max speed:** the largest non-null speed outside ignored windows. If every speed is ignored (a very short track), fall back to the plain max. `null` only when there is no speed at all.

### Behavior
| Situation | Max speed |
|---|---|
| Start-up spike decaying over the first seconds (kayak) | Spike ignored: 20.47 → 10.57 km/h |
| Sustained real top speed mid-track (bike, 41.9 km/h held ~15 s) | Unchanged |
| Real 5, 10 or 20 s sprint mid-track | Unchanged |
| Sprint from the start of recording, lasting past 10 s | Kept: the sprint continues after the ignored window |
| Standing still at the start, then sprinting (race start) | Unchanged: slow values never trigger a spike |
| Spike right after a recording gap > 10 s inside a segment | Ignored the same way |
| Track without time or without any speed | `null`, as before |
| All speeds ignored | Plain max (fallback) |

### Scope
- Applies to `totals.maxSpeed` only. The speed chart, the `speed`/`pace` series, moving time and avg speed don't change; a few seconds of start-up drift move avg speed by well under 1%.
- Selection stats (Phase 13) will reuse the same function.

### Decisions
| Decision | Choice | Reason |
|---|---|---|
| Approach | Settle-window rule | Tested on the real files against longer windows, single-point detour and acceleration filters, a percentile, and a whole-track Hampel filter. Only this rule removes the kayak spike while keeping the bike's real 41.9 km/h and real 5–10 s sprints |
| Settle length | 10 s | Covers the observed ~5 s settle with margin. 30 s also clipped a real sprint from the start (16 → 13 km/h) |
| Ignore the whole window | Yes | Ignoring only the flagged points leaves the spike's tail: the kayak still showed 12.3 km/h |
| Chart filtering | No | Keeps the raw shape visible; the summary states the cleaned peak |
| Thresholds | Constants, not options | Derived from the current files; easy to tune later or per sport (post-MVP) |
| Module | `src/metrics/maxSpeed.ts` | Pure, focused, next to `speed.ts` and `movement.ts` |
| Branch | `2026-10-14-max-speed-settle`; spec stays in `2026-10-14-summary-stats` | Amendment to Phase 9, as decided with the user |

### Reference values
Independent script (segment-aware, brute force; not the app code):

| File | Plain max | Max speed (Amendment A) | Points ignored | Settle starts |
|---|---:|---:|---:|---:|
| `run.gpx` | 13.60 km/h | 13.60 km/h | 0 | 1 |
| `bike.gpx` | 33.73 km/h | 33.73 km/h | 0 | 2 |
| `no-ele-time.gpx` | – | – | – | 0 |
| kayak (`GpxFiles/`) | 20.47 km/h | **10.57 km/h** | 9 | 1 |
| bike (`GpxFiles/`) | 41.93 km/h | 41.93 km/h | 0 | 10 |
| run (`GpxFiles/`) | 15.70 km/h | 15.70 km/h | 0 | 4 |
