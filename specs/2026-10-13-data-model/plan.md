# Plan – Phase 2: Data model and fixtures

Goal: shared types and sample data (see `specs/roadmap.md`, Phase 2). Decisions in `requirements.md`.

## 1. Data model
1. Create `src/model/track.ts` with `TrackPoint` and `Track` exactly as specified in `requirements.md`, with a short doc comment on each field stating its unit.
2. Create `src/model/index.ts` re-exporting the types.
3. Confirm `src/model` imports nothing (no React, no `ui`).

## 2. Source recordings (user)
1. User provides three raw GPX exports: a run with HR/cadence, a bike ride with at least one pause producing 2+ segments, and any track to strip down to lat/lon only.
2. Keep raw exports outside the repo (or in a gitignored folder); only trimmed fixtures are committed.

## 3. Trim and anonymise fixtures
1. Cut each recording to ~50–200 consecutive points, dropping the start and end near private locations.
2. Remove `<metadata>` author/email/link, device serials, and personal names or descriptions.
3. For `bike.gpx`, keep points on both sides of a segment break so 2+ `trkseg` elements remain.
4. For `no-ele-time.gpx`, remove every `ele`, `time`, and `extensions` element from each `trkpt`.
5. Keep original namespaces and extension elements in `run.gpx` (needed by the Phase 3 parser).
6. Save as `src/test/fixtures/run.gpx`, `bike.gpx`, `no-ele-time.gpx`; add a short `src/test/fixtures/README.md` listing each file, its source device, point count, segment count, and which fields it contains.

## 4. Fixture test
1. Add a `declare module '*.gpx?raw'` declaration (or rely on `vite/client` types) so `?raw` imports type-check.
2. Add `src/test/fixtures.test.ts` that imports each fixture as a raw string and, for each one:
   - parses it with `DOMParser` (`application/xml`) and asserts there is no `parsererror`;
   - asserts the `trkpt` count and `trkseg` count match the README;
   - asserts `no-ele-time.gpx` has no `ele` or `time` elements, and `run.gpx` has HR and cadence extension elements.

## 5. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc --noEmit`, `npm test`, `npm run build`.
2. Walk through `validation.md`.
3. Tick the Phase 2 checkboxes in `specs/roadmap.md`.
