# Requirements – Phase 2: Data model and fixtures

## Scope
From `specs/roadmap.md` Phase 2:
- `Track` / `TrackPoint` types (lat, lon, ele?, time?, hr?, cad?).
- 2–3 small GPX fixtures (run, bike, one with no elevation/time).

Also included (decided with the user):
- Segment boundaries kept in the model via `segmentStarts`.
- Fixtures are trimmed and anonymised real recordings supplied by the user.
- One test proving every fixture is well-formed GPX (parses with `DOMParser`, expected `trkpt` count).

## Out of scope
- GPX parsing logic and error handling (Phase 3).
- Derived series such as distance, speed, pace, elevation gain (Phase 6).
- Any UI change; no new runtime dependencies.
- Typed expected-value companions for fixtures (can be added with the Phase 3 parser tests).

## Data model
```ts
interface TrackPoint {
  lat: number;   // degrees, WGS84
  lon: number;   // degrees, WGS84
  ele?: number;  // meters
  time?: number; // epoch milliseconds (UTC)
  hr?: number;   // beats per minute
  cad?: number;  // revolutions or steps per minute, as recorded
}

interface Track {
  name?: string;
  points: TrackPoint[];    // all segments concatenated in file order
  segmentStarts: number[]; // index into `points` where each segment begins; first entry is 0
}
```

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Segments | Flat `points` + `segmentStarts` | Techstack: map and charts refer to points by index; one flat array avoids index mapping, while segment gaps stay known for metrics and drawing |
| Time | `time?: number`, epoch ms | Cheap for tens of thousands of points (mission: fast on large tracks); simple subtraction; metrics convert durations to seconds |
| Units | Meters, degrees, bpm, rpm/spm | Techstack: SI storage, formatting only in the UI |
| Optional fields | `?:` (absent, not `null`/`NaN`) | Matches GPX where any child element may be missing |
| Type location | `src/model/track.ts`, re-exported from `src/model/index.ts` | Shared by `parser`, `metrics`, and `ui`; has no dependencies, so no layer imports `ui` |
| Fixture source | Trimmed real recordings from the user | Realistic device extension namespaces (e.g. Garmin `TrackPointExtension`) for the Phase 3 parser |
| Fixture location | `src/test/fixtures/*.gpx` | Next to existing test setup; loaded in tests via Vite `?raw` imports |
| Fixture size | ~50–200 points each | Small enough to read and diff; large enough to be realistic |
| Branch / directory | `2026-10-13-data-model` | Spec naming convention `yyyy-mm-dd-feature-name`; branched from `2026-10-07-scaffold` because Phase 1 is not merged into `main` yet |

## Fixture set
| File | Activity | Must contain |
|---|---|---|
| `run.gpx` | Run | `ele`, `time`, HR and cadence extensions; single segment |
| `bike.gpx` | Ride | `ele`, `time`; at least 2 `trkseg` segments |
| `no-ele-time.gpx` | Any | Only `lat`/`lon` on every `trkpt` (no `ele`, no `time`) |

Anonymisation rules for every fixture:
- Remove `<metadata>` author, email, link, and device serial numbers.
- Trim the start and end so no home or workplace location is included.
- Remove all other personal identifiers (names in `<name>` or `<desc>` if personal).

## Context
- `specs/mission.md`: private by default — fixtures must not leak personal location or identity. Users are runners, cyclists, kayakers, windsurfers; the fixtures cover running and cycling now (sport-specific fixtures are post-MVP).
- `specs/techstack.md`: own parser using `DOMParser`; parser and metrics are pure, UI-free functions; single source of truth is the Track plus arrays indexed by point index.
- Phase 1 created `src/parser`, `src/metrics`, `src/ui`, and Vitest with jsdom (provides `DOMParser`).
