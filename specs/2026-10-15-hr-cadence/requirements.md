# Requirements – Phase 14: HR and cadence

## Scope
From `specs/roadmap.md` Phase 14 (optional sensor data):
- Heart rate and cadence charts, each shown only when the track has that data.
- Avg/max heart rate and cadence in the stats panel.

Decided (recommended defaults; the user asked not to be asked unless necessary):
- **Two separate charts**, "Heart rate" and "Cadence", below the speed chart. A track without HR or cadence shows **no card** for it (not an empty state like elevation and speed, which every track is expected to have).
- Both charts are full members of the linked views: shared hover, zoom (wheel, drag, slider, reset, zoom to selection) and brush selection, on both x-axis modes.
- **Stats:** Avg HR (Phase 9) gains **Max HR**, **Avg cadence** and **Max cadence**. All four go through `getRangeStats`, so they follow the selection (Phase 13).
- **Cadence is shown as recorded**, in "rpm". Garmin writes running cadence per leg (one stride cycle per minute, ~70–90) and cycling cadence as crank revolutions: both are revolutions per minute. Converting running cadence to steps per minute needs the sport, which is post-MVP ("Per-sport defaults").
- Branch and spec directory `2026-10-15-hr-cadence`.

## Out of scope
- Smoothing the HR or cadence lines, HR zones, time-in-zone.
- Filtering optical HR spikes out of Max HR.
- Steps-per-minute conversion for running, per-sport defaults (post-MVP).
- Other extension fields (temperature, power).

## API
```ts
// src/metrics/sensors.ts
type SensorField = 'hr' | 'cad'

interface SensorStats {
  /**
   * Time-weighted: each included sample counts for the time until the next timed point of its
   * segment inside the range. Plain mean of the included samples when no interval exists.
   * Null when no sample in range is included.
   */
  average: number | null
  /** Largest sample in range, included or not; null when none. */
  max: number | null
}

/** Average and max of a point field over `range` (default the whole track), in one pass. */
function getSensorStats(
  track: Track,
  elapsed: (number | null)[],
  field: SensorField,
  range?: PointRange,
  include?: (value: number) => boolean, // which samples count towards the average
): SensorStats

/** Cadence: the average leaves zero samples (stopped, coasting) out; the max is the largest sample. */
function getCadenceStats(track: Track, elapsed: (number | null)[], range?: PointRange): SensorStats

// src/metrics/heartRate.ts: getAverageHeartRate keeps its signature and results,
// now getSensorStats(track, elapsed, 'hr', range).average.

// src/metrics/rangeStats.ts (TrackTotals gains)
interface TrackTotals {
  // …existing
  maxHeartRate: number | null // bpm
  avgCadence: number | null // rpm, as recorded, zeros excluded
  maxCadence: number | null // rpm, as recorded
}

// src/ui/format.ts (added)
function formatCadence(rpm: number): string // "69 rpm"

// src/ui/charts/sensorOption.ts
type SensorKind = 'heartRate' | 'cadence'
function buildSensorOption(track, metrics, mode, kind: SensorKind, withSlider?): LineChart

// src/ui/charts/SensorChart.tsx
function SensorChart(props: { track; metrics; mode; kind: SensorKind; withSlider?: boolean }): JSX.Element

// src/ui/view/viewStore.ts
type HoverSource = 'map' | 'elevation' | 'speed' | 'heartRate' | 'cadence'
```

## Behavior
| Situation | Result |
|---|---|
| Track with HR | "Heart rate" chart (bpm, raw samples) after the speed chart; Avg HR and Max HR in the summary |
| Track with cadence | "Cadence" chart (rpm, raw samples) after the heart rate chart; Avg cadence and Max cadence in the summary |
| Track without HR / cadence | No chart card and no stats for it; the other charts are unchanged |
| Points missing a sample | A gap in the line (`connectNulls: false`), like elevation |
| Time axis | Same segment breaks as the other charts; untimed points are left out |
| Selection | All four stats computed over the selection |
| Max HR / Max cadence | Largest raw sample in range |
| Avg cadence | Time-weighted like Avg HR, zero samples skipped (stopping or coasting doesn't pull the average down); plain mean of non-zero samples without time; `null` when no non-zero sample |
| Zoom slider | Under the last chart shown: cadence, else heart rate, else speed (with time), else elevation |

## UI
- **Chart order:** Elevation, Speed/Pace, Heart rate, Cadence. Same card, height, x-axis, grid, tooltip format ("1.23 km · 152 bpm", "1.23 km · 82 rpm"), brush and zoom as the existing charts, so the x-axes stay aligned.
- **Colors:** heart rate `#dc2626` (red), cadence `#7c3aed` (violet); both distinct from elevation teal, speed blue and the amber brush.
- **y-axis:** `scale: true` (doesn't start at 0), whole-number labels "150 bpm" / "80 rpm".
- **Stats order:** Distance, Duration, Elevation gain, Avg speed, Max speed, Avg HR, Max HR, Avg cadence, Max cadence; each hidden when `null`. Labels in sentence case.
- No horizontal page scroll at 375 px with four charts and nine stats (the `dl` wraps).

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| One chart or two | Two (HR, cadence) | Different units and scales; a dual-axis chart is hard to read on a phone |
| Missing data | No card at all | Roadmap: "shown only when data exists"; most bike/kayak files have no cadence, so an empty card would be noise |
| Chart component | One `SensorChart` with a `kind` | The two charts differ only in field, color, label and unit |
| Line data | Raw samples | Sensors already report smoothed values; matches Garmin Connect |
| Max HR | Plain max | No GPS-style settle problem; optical spikes are a known limitation |
| Avg cadence zeros | Excluded | Matches Garmin/Strava; coasting on a bike would otherwise drag it down |
| Cadence unit | "rpm", as recorded | Correct for both Garmin running (per leg) and cycling; spm conversion needs the sport |
| Shared averaging | `getSensorStats` (average and max in one pass) | Avg HR and Avg cadence follow one rule; Phase 9 results stay identical. One pass per field instead of three keeps `getRangeStats` fast enough to run per frame |
| Field reads | Named readers (`p => p.hr`, `p => p.cad`) | A keyed read (`p[field]`) of a field most points lack was ~5× slower in V8 |
| Range-stats speed guard | 100 000 points, fastest of 10 runs after a warm-up, under 32 ms (was 16 ms in Phase 13) | ~6 ms alone, but ~17 ms while the other test workers load the CPU; the guard still catches superlinear regressions |
| Hover sources | `'heartRate'`, `'cadence'` | Each chart must ignore only its own hover echoes |

## Reference values
Independent script (regex GPX parsing, brute force; not the app code):

| File | Range | Max HR | Avg cadence | Max cadence |
|---|---|---:|---:|---:|
| `run.gpx` | whole | 159 bpm | 69.25 rpm | 79 rpm |
| `run.gpx` | [30, 119] | 159 bpm | 70.98 rpm | 77 rpm |
| `bike.gpx` | whole | 166 bpm | – | – |
| `bike.gpx` | [50, 149] | 166 bpm | – | – |
| `no-ele-time.gpx` | whole | – | – | – |
| run (`GpxFiles/run_24545718755.gpx`) | whole | 164 bpm | 72.53 rpm | 79 rpm |
| run (`GpxFiles/run_24545718755.gpx`) | [100, 399] | 159 bpm | 72.75 rpm | 79 rpm |
| bike (`GpxFiles/bike_24025393290.gpx`) | whole | 166 bpm | – | – |
| kayak (`GpxFiles/kayak_24664631302.gpx`) | whole | 133 bpm | – | – |

`run.gpx` has one zero cadence sample: the plain mean with zeros would be 67.35 rpm. Shown in the summary for `run.gpx`: "159 bpm", "69 rpm", "79 rpm". Avg HR is unchanged (Phase 9: 143.82 / 155.95 bpm).

## Context
- Phase 3 parser reads `hr` and `cad` from any extension prefix; `getAvailableFields` reports them (badges).
- Phase 9 `getAverageHeartRate` (time-weighted); Phase 13 `getRangeStats`, `clipSegmentRanges`, `useDisplayedStats`.
- Phases 10–12 hooks `useChartHover`, `useChartZoom`, `useChartBrush` and `buildLineOption` work for any line chart.
- Fixtures: `run.gpx` has HR and cadence on all 150 points; `bike.gpx` HR only; `no-ele-time.gpx` neither. In `GpxFiles/` only the run has cadence.

## Known limitations
- Optical HR glitches (e.g. cadence lock at the start of a run) count in Max HR.
- Running cadence reads about half of what Garmin Connect shows in spm, by design (as recorded).
