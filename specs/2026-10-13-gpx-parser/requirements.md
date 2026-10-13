# Requirements – Phase 3: GPX parser

## Scope
From `specs/roadmap.md` Phase 3:
- Parses `trkpt`, `ele`, `time`, HR/cadence extensions.
- Handles multiple segments and missing fields.
- Invalid XML/GPX returns a clear error.
- Unit tests on fixtures.

Also included (decided with the user):
- Result-union return type instead of exceptions.
- Lenient handling of individual bad points.
- HR/cadence matched by element local name, independent of namespace or prefix.
- Inline edge-case tests in addition to the Phase 2 fixtures.

## Out of scope
- Upload UI, `File`/`FileReader` handling, showing errors (Phase 4).
- Derived metrics: distance, speed, elevation gain (Phase 6).
- Routes (`rte`/`rtept`) and waypoints (`wpt`); other formats (FIT, TCX) are a mission non-goal.
- Other extension fields (temperature, power, speed); performance budget tests.

## API
```ts
// src/parser/gpx.ts, re-exported from src/parser/index.ts
type GpxErrorCode = 'invalid-xml' | 'not-gpx' | 'no-points'

interface GpxError {
  code: GpxErrorCode
  message: string // user-facing, e.g. "This file is not valid XML."
}

type ParseResult = { ok: true; track: Track } | { ok: false; error: GpxError }

function parseGpx(text: string): ParseResult
```

## Behavior
| Input | Result |
|---|---|
| Text that is not well-formed XML | `invalid-xml` |
| Well-formed XML whose root is not `gpx` | `not-gpx` |
| GPX with no valid `trkpt` (none, all empty segments, or all invalid) | `no-points` |
| `trkpt` with missing, non-numeric, or out-of-range `lat`/`lon` | Point skipped |
| Bad `ele`, `time`, `hr`, or `cad` on an otherwise valid point | That field omitted; point kept |
| Multiple `trk` elements | All their `trkseg`s concatenated in file order |
| Empty `trkseg` (or one whose points are all skipped) | Not added to `segmentStarts` |
| Track name | First `trk/name`, else `metadata/name`, else absent |

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Error reporting | Result union `{ ok, track } \| { ok, error }` | Errors are explicit in the type; the Phase 4 UI branches on `ok` without try/catch |
| Bad points | Lenient: skip point without valid lat/lon, drop only the bad optional field | Real device files have glitches; one bad point should not reject a whole activity |
| Extension matching | By local name: `hr`/`heartrate`, `cad`/`cadence`, anywhere under the point's `extensions` | Covers Garmin TrackPointExtension v1/v2 with any prefix (`ns3:`, `gpxtpx:`) and other vendors |
| GPX namespace | Matched by local name (`getElementsByTagNameNS('*', …)`) | Accepts GPX 1.0 and 1.1 and files with no namespace |
| Time | `Date.parse` → epoch ms; `NaN` dropped | Matches the Phase 2 model |
| Numbers | `Number(text.trim())`, must be finite; lat in [-90, 90], lon in [-180, 180] | Rejects empty strings and garbage without silently producing `0` |
| Input | `string` (file text) | Parser stays pure and UI-free; reading the `File` is the UI's job |
| Location | `src/parser/gpx.ts` (+ small helpers if it grows past ~200 lines) | Techstack layers; lint rule already blocks UI imports |
| Branch / directory | `2026-10-13-gpx-parser` | Spec naming convention `yyyy-mm-dd-feature-name` |

## Context
- `specs/mission.md`: private, browser-only. Parsing uses the browser `DOMParser`, with no server. Fast on large tracks means a single linear pass with no per-point re-querying of the whole document.
- `specs/techstack.md`: own parser using `DOMParser`; parser is a pure, unit-tested function; SI units.
- Phase 2 delivered `Track`/`TrackPoint` in `src/model` and fixtures in `src/test/fixtures`: `run.gpx` (150 pts, HR+cad), `bike.gpx` (200 pts, 2 segments), `no-ele-time.gpx` (80 pts, lat/lon only).
- Vitest runs under jsdom, which provides `DOMParser`. jsdom reports XML errors as a `parsererror` element.
