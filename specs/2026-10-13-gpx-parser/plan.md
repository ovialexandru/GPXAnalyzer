# Plan – Phase 3: GPX parser

Goal: GPX text → Track (see `specs/roadmap.md`, Phase 3). API and behavior in `requirements.md`.

## 1. Types and entry point
1. Create `src/parser/gpx.ts` with `GpxErrorCode`, `GpxError`, `ParseResult`, and an exported `parseGpx(text: string): ParseResult`.
2. Re-export `parseGpx` and the types from `src/parser/index.ts`.

## 2. Document validation
1. Parse with `new DOMParser().parseFromString(text, 'application/xml')`.
2. If a `parsererror` element is present → `invalid-xml`.
3. If `documentElement.localName !== 'gpx'` → `not-gpx`.

## 3. Point parsing
1. Add pure helpers: `parseNumber(text)` (trimmed, finite, else `undefined`) and `parseTime(text)` (`Date.parse`, `NaN` → `undefined`).
2. For each `trkpt`: read `lat`/`lon` attributes; skip the point if either is invalid or out of range.
3. Read the first direct-child `ele` and `time`; set the fields only when valid.
4. Under the point's `extensions`, find the first descendant with local name `hr`/`heartrate` and `cad`/`cadence`; set the fields only when valid and ≥ 0.
5. Build each `TrackPoint` with only the defined fields (no `undefined` keys), so `toEqual` comparisons stay simple.

## 4. Segments and track assembly
1. Iterate every `trk` → `trkseg` → `trkpt` in document order (namespace-agnostic, by local name).
2. Before each segment's first kept point, push `points.length` to `segmentStarts`; segments with no kept points add nothing.
3. Name: first `trk` `name`, else `metadata` `name`, trimmed; omit when empty.
4. If `points` is empty → `no-points`; otherwise return `{ ok: true, track }`.
5. Write clear, user-facing messages for each error code.

## 5. Fixture tests
Add `src/parser/gpx.test.ts` using the Phase 2 fixtures via `?raw`:
1. `run.gpx`: 150 points, `segmentStarts` `[0]`, every point has `ele`, `time`, `hr`, `cad`; first point's values match the file exactly.
2. `bike.gpx`: 200 points, `segmentStarts` `[0, 100]`, HR present, no `cad`.
3. `no-ele-time.gpx`: 80 points with only `lat`/`lon` keys.
4. Names come from `<trk><name>`.

## 6. Edge-case tests (inline XML)
1. Not XML (`"hello"`, truncated GPX) → `invalid-xml`.
2. Valid XML, wrong root (`<kml/>`) → `not-gpx`.
3. GPX with no `trk`, with only empty `trkseg`s, or with only invalid points → `no-points`.
4. Multiple `trk` elements → points concatenated, `segmentStarts` correct; empty middle segment skipped.
5. Bad `lat`/`lon` (missing, `"abc"`, `"91"`) → point skipped, others kept.
6. Bad `ele`/`time`/`hr` → field omitted, point kept.
7. Extensions with a different prefix/namespace (`gpxtpx:hr`, TPX v2) and alternative names (`heartrate`, `cadence`) are read.
8. GPX 1.0 namespace and a file with no namespace both parse.

## 7. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run build`.
2. Walk through `validation.md`.
3. Tick the Phase 3 checkboxes in `specs/roadmap.md`.
