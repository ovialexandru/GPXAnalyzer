# Plan – Phase 4: Upload UI

Goal: user can load a file (see `specs/roadmap.md`, Phase 4). API and behavior in `requirements.md`.

## 1. Available-data helper (metrics)
1. Create `src/metrics/fields.ts` with `AvailableFields` and `getAvailableFields(track)` (single pass, early exit once all four are found).
2. Re-export from `src/metrics/index.ts`.
3. Add `src/metrics/fields.test.ts`: `run.gpx` → all true; `bike.gpx` → `cad` false; `no-ele-time.gpx` → all false.

## 2. File loading (pure, no React)
1. Create `src/ui/upload/loadGpxFile.ts` with `UploadErrorCode`, `UploadError`, `LoadedTrack`, `LoadResult`, `MAX_FILE_BYTES`, and `loadGpxFile(file)`.
2. Check in order: extension (case-insensitive `.gpx`) → size `0` → size > 50 MB; return the error without reading the file.
3. Read with `await file.text()`; on rejection return `read-failed`.
4. Call `parseGpx`; map `{ ok: false }` to an `UploadError` with the parser's code and message; on success return `{ fileName: file.name, track }`.
5. Add `src/ui/upload/loadGpxFile.test.ts`: each check, a `File` built from each fixture (`?raw`), a non-GPX XML file, and a mocked `text()` rejection. Use a fake `size` (e.g. `Object.defineProperty`) for the 50 MB case instead of allocating 50 MB.

## 3. Upload hook
1. Create `src/ui/upload/useGpxUpload.ts` holding `loaded`, `error`, `notice`, `loading` in `useState`.
2. `loadFiles(files)`: empty list → no-op; more than one → set `notice`; take the first file, set `loading`, call `loadGpxFile`.
3. Track a request counter in a `useRef`; apply the result only if it belongs to the latest request.
4. On success: set `loaded`, clear `error`. On failure: set `error`, keep `loaded`. Always clear `loading`.
5. Clear the previous `notice` at the start of each new load.

## 4. Components and styles
1. `src/ui/upload/FileDropZone.tsx` + `FileDropZone.module.css`: `onDragEnter`/`onDragOver`/`onDragLeave`/`onDrop` with `preventDefault`, drag-over highlight, "Choose file" `<button>` that clicks a hidden `<input type="file" accept=".gpx">`; reset the input's value after change so the same file can be picked again. Props: `onFiles(files)`, `disabled?`.
2. `src/ui/upload/TrackSummary.tsx` + `TrackSummary.module.css`: file name, point count via `toLocaleString()`, track name when present, badges from `getAvailableFields` (labels: Elevation, Time, Heart rate, Cadence).
3. In `App.tsx`: use `useGpxUpload`; render title, `FileDropZone`, a `role="status"` region (loading text / notice), a `role="alert"` region (error), and `TrackSummary` when `loaded`.
4. Add a window-level `dragover`/`drop` `preventDefault` effect in `App` so drops outside the zone do not open the file.
5. Add `src/ui/upload/index.ts` re-exporting the public pieces; keep each file under ~200 lines.

## 5. Component tests (React Testing Library)
Extend `src/ui/App.test.tsx` (and/or add `src/ui/upload/*.test.tsx`):
1. Picker: `userEvent.upload` / `fireEvent.change` with the `run.gpx` fixture → file name, "150" points, track name, all four badges shown.
2. Drop: `fireEvent.drop` with a `dataTransfer.files` list → summary shown.
3. Bad file (`.txt`, empty, invalid XML) → `role="alert"` with the expected message.
4. Bad file after a good one → error shown and previous summary still visible.
5. Good file after a bad one → error cleared, new summary shown.
6. Two files dropped → first loaded, notice shown.
7. Loading: with `loadGpxFile` pending (controlled promise), "Reading file…" is shown, then disappears.
8. `no-ele-time.gpx` → no badges.

## 6. Playwright smoke test
1. `npm i -D @playwright/test` and `npx playwright install chromium`.
2. Add `playwright.config.ts`: `testDir: 'e2e'`, Chromium project only, `webServer` running `npm run dev` on a fixed port with `reuseExistingServer: !process.env.CI`.
3. Add `e2e/upload.spec.ts`: `setInputFiles` with `src/test/fixtures/run.gpx` → file name and "150" visible; then a non-GPX file → alert visible.
4. Add script `"test:e2e": "playwright test"`.
5. Exclude `e2e/**` from Vitest (`test.exclude` in `vite.config.ts`, keeping defaults).
6. Add `e2e` and `playwright.config.ts` to `tsconfig.node.json` `include` so they are type-checked and linted.
7. Add `test-results/`, `playwright-report/`, `playwright/.cache/` to `.gitignore`.

## 7. Verification
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run build`.
2. Manual desktop check with `npm run dev` (see `validation.md`).
3. Walk through `validation.md`.
4. Tick the Phase 4 checkboxes in `specs/roadmap.md`.
