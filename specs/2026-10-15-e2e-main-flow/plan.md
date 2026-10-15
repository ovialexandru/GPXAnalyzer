# Plan – Phase 16: E2E tests

Goal: protect the main flow (see `specs/roadmap.md`, Phase 16). Steps, reference values and invariants in `requirements.md`.

## 1. Shared helpers
1. Add to `e2e/helpers.ts`: `trackPage`, `loadTrack`, `summaryStat`, `tooltipAt`, `xAt`, `meters`, `seconds`, `horizontalOverflow`, `wheelZoomIn`, `TOOLTIP`, `KM_TOLERANCE` (API in `requirements.md`).
2. Switch the specs to them, deleting their local copies: `chart-zoom`, `hover-linking`, `hr-cadence`, `mobile`, `range-selection`, `selection-stats`, `units`, `chart-collapse` (and `upload` / `states` where it shortens them).
3. Run `npm run test:e2e`: the same 45 tests pass, none renamed or removed.

## 2. Main-flow spec
1. Create `e2e/main-flow.spec.ts` with one test and a `test.step` per stage (Open, Upload, Hover, Zoom, Select, Zoom to selection, Units, Clear, Second file), using only shared helpers.
2. Add a small `wholeTrackStats(page)` check against the reference table (all nine stats for `run.gpx`, seven for `bike.gpx`, and no cadence entries).
3. Add `selectionInvariants(page, whole)` for the span, part-of-the-whole and nothing-missing rules.
4. Collect console errors/warnings and aborted external requests from the start; assert both are empty at the end.
5. If a step fails because of an app bug, fix it in its own commit with a unit test, and add a note under "Findings" in `requirements.md`.

## 3. Repeat gate
1. Add `"test:e2e:repeat": "playwright test --repeat-each=3"` to `package.json`; list it in the README scripts table.
2. Run it; any failure is fixed (test or app), never retried away.

## 4. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run test:e2e:repeat`, `npm run build`.
2. Walk through `validation.md`.
3. Tick the Phase 16 checkbox in `specs/roadmap.md`.
