# Validation – Phase 16: E2E tests

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-15-e2e-main-flow`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true` (including `e2e/`).
- [ ] `npm test` passes unchanged.
- [ ] `npm run test:e2e` passes in Chromium with no real external requests.
- [ ] `npm run test:e2e:repeat` (every e2e test 3 times) passes with **zero** failures and no retries.
- [ ] `npm run build` produces `dist/` with no errors.

## Main flow (`e2e/main-flow.spec.ts`)
- [ ] One test, with a named `test.step` for each of: Open, Upload, Hover, Zoom, Select, Zoom to selection, Units, Clear, Second file.
- [ ] After upload and after clearing the selection, the `run.gpx` summary shows exactly the reference values in `requirements.md`; after the second file, the `bike.gpx` values.
- [ ] Hover shows the tooltip and moves the map marker; leaving removes it.
- [ ] Zoom gives every chart the same window and enables "Reset zoom".
- [ ] The selection is drawn on the map and the summary's selection stats satisfy the span, part-of-the-whole and nothing-missing invariants.
- [ ] "Zoom to selection" fits the charts to the selection line's range; "Reset zoom" keeps the selection.
- [ ] Imperial and back to Metric changes the texts and not the selection.
- [ ] The second file starts with no zoom, no selection and no cadence chart.
- [ ] No console errors or warnings, no request outside localhost.
- [ ] Breaking a link on purpose makes the test fail at the matching step (checked by hand, e.g. commenting out `store.setSelection` in `useChartBrush`, then reverted).

## Helpers
- [ ] `regions()`, `load()`, `stat()`, tooltip and overflow helpers exist only in `e2e/helpers.ts`; no spec keeps a copy.
- [ ] The existing 45 tests still pass with the same names (only the new test is added).

## Design
- [ ] No app code changes, unless a bug found by the flow is fixed in its own commit with a unit test and noted in `requirements.md`.
- [ ] No new dependencies; no Playwright projects added.
- [ ] `test:e2e:repeat` is listed in the README.

## Merge gate
- [ ] The Phase 16 checkbox in `specs/roadmap.md` is ticked.
- [ ] Phase 4–15 validations still hold.
- [ ] No files from `GpxFiles/` are committed.
