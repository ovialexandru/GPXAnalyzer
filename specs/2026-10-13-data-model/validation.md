# Validation – Phase 2: Data model and fixtures

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-13-data-model`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc --noEmit` passes with `strict: true`.
- [ ] `npm test` passes, including the existing App smoke test and the new fixture test.
- [ ] `npm run build` produces `dist/` with no errors.

## Fixtures are valid XML
- [ ] Each of `run.gpx`, `bike.gpx`, `no-ele-time.gpx` parses with `DOMParser` with no `parsererror`.
- [ ] Each fixture's `trkpt` and `trkseg` counts match `src/test/fixtures/README.md`.
- [ ] `bike.gpx` has 2 or more `trkseg` elements.
- [ ] `no-ele-time.gpx` contains no `ele` or `time` elements.
- [ ] `run.gpx` contains HR and cadence extension elements.

## Data model
- [ ] `src/model/track.ts` defines `TrackPoint` (`lat`, `lon`, `ele?`, `time?`, `hr?`, `cad?`) and `Track` (`name?`, `points`, `segmentStarts`) as in `requirements.md`.
- [ ] `time` is documented as epoch milliseconds; other units documented as SI.

## Privacy
- [ ] No fixture contains author, email, device serial, or personal names.
- [ ] No fixture starts or ends at a home or workplace location.
- [ ] Raw, untrimmed recordings are not committed.

## Merge gate
- [ ] All Phase 2 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the Phase 2 checkboxes in `specs/roadmap.md`.
- [ ] The app is in a working, shippable state (mission principle: small steps).
