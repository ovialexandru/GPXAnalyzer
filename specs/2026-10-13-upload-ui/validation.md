# Validation – Phase 4: Upload UI

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-13-upload-ui`.

## Automated (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true` (including `e2e/` and `playwright.config.ts`).
- [ ] `npm test` passes, including all existing parser and fixture tests; Vitest does not pick up `e2e/`.
- [ ] `npm run test:e2e` passes in Chromium.
- [ ] `npm run build` produces `dist/` with no errors.

## Unit tests – `loadGpxFile` and `getAvailableFields`
- [ ] Non-`.gpx` extension → `wrong-extension`; `.GPX` (uppercase) is accepted.
- [ ] 0-byte file → `empty-file`.
- [ ] File over 50 MB → `too-large`, and `text()` is never called.
- [ ] `text()` rejection → `read-failed`.
- [ ] Invalid XML / non-GPX / no points → parser's code and message passed through.
- [ ] Each fixture loads with the correct `fileName` and point count (150 / 200 / 80).
- [ ] `getAvailableFields`: `run.gpx` all true; `bike.gpx` `cad` false; `no-ele-time.gpx` all false.

## Component tests – React Testing Library
- [ ] File picker upload shows file name, point count, track name, and data badges.
- [ ] Simulated drop shows the same summary.
- [ ] Bad file shows a `role="alert"` message matching `requirements.md`.
- [ ] Bad file after a good one keeps the previous summary visible.
- [ ] Good file after a bad one clears the error.
- [ ] Two files dropped → first one loaded and a notice shown.
- [ ] "Reading file…" is visible while loading and gone afterwards.
- [ ] Only the latest file's result is applied when two loads overlap.

## E2E – Playwright
- [ ] Uploading `run.gpx` via the file input shows its name and "150".
- [ ] Uploading a non-GPX file shows the error alert.

## Manual – desktop browser (`npm run dev`)
- [ ] Drag-and-drop and "Choose file" both load the three fixtures and the files in `GpxFiles/`.
- [ ] Drop zone highlights while dragging over it.
- [ ] Dropping a file outside the drop zone does not open it in the browser.
- [ ] Picking the same file twice in a row reloads it.
- [ ] A wrong file shows a clear message; the previously loaded track stays shown.

## Design
- [ ] `loadGpxFile` and `getAvailableFields` are pure of React; `src/metrics` imports only from `src/model`.
- [ ] Track state lives in `useGpxUpload` (`useState`); no context or Zustand added.
- [ ] Components use CSS modules; no global styles beyond what is required.
- [ ] Errors use `role="alert"`; loading/notice use `role="status"`; "Choose file" is a real `<button>`.
- [ ] File contents never leave the browser (no network requests besides the dev server).
- [ ] Only new dependency is `@playwright/test` (dev); no module over ~200 lines.

## Merge gate
- [ ] All Phase 4 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Existing `specs/` files are unchanged except for the Phase 4 checkboxes in `specs/roadmap.md`.
- [ ] No files from `GpxFiles/` are committed.
- [ ] The app is in a working, shippable state (mission principle: small steps).
