# Validation – Phase 3: GPX parser

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-13-gpx-parser`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true`.
- [ ] `npm test` passes, including the existing smoke and fixture tests.
- [ ] `npm run build` produces `dist/` with no errors.

## Fixture tests
- [ ] `run.gpx` → 150 points, `segmentStarts` `[0]`, all points have `ele`, `time`, `hr`, `cad`.
- [ ] `bike.gpx` → 200 points, `segmentStarts` `[0, 100]`, HR present, no cadence.
- [ ] `no-ele-time.gpx` → 80 points with only `lat`/`lon`.
- [ ] First point of `run.gpx` matches the file's values exactly (time as epoch ms).

## Edge-case inline tests
- [ ] Not-XML input → `{ ok: false, error.code: 'invalid-xml' }`.
- [ ] Non-GPX root → `not-gpx`.
- [ ] No points (no `trk`, empty segments, or all points invalid) → `no-points`.
- [ ] Multiple `trk` elements concatenate correctly; empty segments are not in `segmentStarts`.
- [ ] Points with bad `lat`/`lon` are skipped; bad optional fields are omitted without dropping the point.
- [ ] HR/cadence are read regardless of prefix or namespace, including `heartrate`/`cadence` names.
- [ ] GPX 1.0 and namespace-less files parse.
- [ ] Every error has a non-empty, user-facing `message`.

## Design
- [ ] `parseGpx` is exported from `src/parser/index.ts` and takes a `string`, not a `File`.
- [ ] `src/parser` imports only from `src/model` (no UI, no React); lint rule passes.
- [ ] No new runtime dependencies; no module over ~200 lines.
- [ ] Parsed points contain no `undefined`-valued keys.

## Merge gate
- [ ] All Phase 3 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the Phase 3 checkboxes in `specs/roadmap.md`.
- [ ] The app is in a working, shippable state (mission principle: small steps).
