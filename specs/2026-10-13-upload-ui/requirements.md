# Requirements – Phase 4: Upload UI

## Scope
From `specs/roadmap.md` Phase 4:
- Drag-and-drop and file picker.
- Shows file name and point count.
- Error message for bad files.

Also included (decided with the user):
- Pre-parse checks: `.gpx` extension, empty file, max size 50 MB, multiple files dropped.
- Summary also shows the track name and which data is available (elevation, time, heart rate, cadence).
- A "Reading file…" loading indicator while the file is read and parsed.
- CSS modules per component, introduced as the styling convention.
- Playwright installed now, with one upload smoke test.

## Out of scope
- Map, charts, metrics (Phases 5–8).
- Shared state via context/Zustand (comes with hover linking in Phase 10).
- Whole-window drop target and overlay; full responsive layout and polish (Phase 15).
- Multi-file loading (post-MVP); only the first dropped file is used.
- Parsing in a Web Worker; performance tuning beyond "no noticeable freeze" on real files.

## API
```ts
// src/ui/upload/loadGpxFile.ts
type UploadErrorCode =
  | 'wrong-extension'
  | 'empty-file'
  | 'too-large'
  | 'read-failed'
  | GpxErrorCode // 'invalid-xml' | 'not-gpx' | 'no-points' from the parser

interface UploadError {
  code: UploadErrorCode
  message: string // user-facing
}

interface LoadedTrack {
  fileName: string
  track: Track
}

type LoadResult = { ok: true; loaded: LoadedTrack } | { ok: false; error: UploadError }

const MAX_FILE_BYTES = 50 * 1024 * 1024

function loadGpxFile(file: File): Promise<LoadResult>

// src/metrics/fields.ts, re-exported from src/metrics/index.ts
interface AvailableFields { ele: boolean; time: boolean; hr: boolean; cad: boolean }
function getAvailableFields(track: Track): AvailableFields // true if any point has the field

// src/ui/upload/useGpxUpload.ts
function useGpxUpload(): {
  loaded: LoadedTrack | null
  error: UploadError | null
  notice: string | null // e.g. "Only one file at a time is supported; loaded track.gpx."
  loading: boolean
  loadFiles: (files: FileList | File[]) => void
}
```

## Behavior
| Situation | Result |
|---|---|
| Valid `.gpx` file (picker or drop) | Summary shows file name, point count, track name (if any), available-data badges |
| Extension is not `.gpx` (case-insensitive) | `wrong-extension` error; file not read |
| 0-byte file | `empty-file` error |
| File larger than 50 MB | `too-large` error; file not read |
| `File.text()` rejects | `read-failed` error |
| Parser returns an error | Parser's code and message shown |
| More than one file dropped/picked | First file loaded; notice says only one file is supported |
| Bad file while a track is loaded | Error shown; previous track and summary stay visible |
| Good file while a track is loaded | Replaces the track; any previous error cleared |
| New file chosen while a previous one is still loading | Only the latest file's result is applied |
| File dropped outside the drop zone | Browser does not navigate away/open the file |
| Read/parse in progress | "Reading file…" shown; drop zone stays usable |

## UI
- `FileDropZone`: a visible zone with text "Drop a GPX file here or" and a real `<button>` "Choose file" that opens a hidden `<input type="file" accept=".gpx">`. Drag-over adds a highlight class. Tap target at least 44 px high.
- `TrackSummary`: file name, point count (locale-formatted), track name when present, badges for available data.
  > **Superseded by Phase 9 (`specs/2026-10-14-summary-stats`):** the track name becomes the heading with the file name beside it, and the point count is no longer shown.
- Errors render in an element with `role="alert"`; the loading text and notice in a `role="status"` region.
- `App` composes `useGpxUpload` + `FileDropZone` + `TrackSummary` + error/status; no component over ~200 lines.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Track state | `useState` inside `useGpxUpload`, used by `App` | Nothing else needs it yet; context/Zustand arrives with Phase 10 |
| Structure | Pure `loadGpxFile` + `useGpxUpload` hook + presentational components | File checks and parsing are unit-testable without React; components stay small |
| Replacement | Replace only on success; bad file keeps previous track | User never loses a working view because of one wrong file |
| Pre-parse checks | Extension, empty, 50 MB, multiple files | Clear messages instead of generic XML errors; 50 MB covers multi-hour tracks with extensions |
| Reading | `File.text()` (UTF-8) | Promise-based, supported in all target browsers; techstack says files are read in the browser |
| Available data | `getAvailableFields` in `src/metrics` | Track → derived info is the metrics layer's job; pure and unit-tested |
| Drop target | Drop zone only; `window` `dragover`/`drop` default prevented | Predictable; avoids the browser opening the GPX and losing the app |
| Styling | CSS modules (`*.module.css`) per component | Scoped class names; convention for later phases. Vite supports them out of the box |
| Loading state | Simple "Reading file…" text | Large files take noticeable time on phones |
| Stale results | Request counter in the hook; ignore results from older requests | Picking a second file quickly must not show the first one |
| E2E | Playwright now (Chromium only), one upload smoke test | Sets up the tool early; Phases 15–16 extend it |
| Location | `src/ui/upload/` for the upload feature | Keeps `src/ui` organized by feature as it grows |
| Branch / directory | `2026-10-13-upload-ui` | Spec naming convention `yyyy-mm-dd-feature-name` |

## Error messages
| Code | Message |
|---|---|
| `wrong-extension` | "Please choose a .gpx file." |
| `empty-file` | "This file is empty." |
| `too-large` | "This file is larger than 50 MB." |
| `read-failed` | "The file could not be read." |
| Parser codes | The parser's own `message` |

## Context
- `specs/mission.md`: private by default (file never leaves the browser), no backend, mobile-friendly with tap-sized controls, small steps.
- `specs/techstack.md`: React + Vite, `File`/`FileReader` in the browser, layers `parser` → `metrics` → `ui`, components under ~200 lines, Playwright for E2E.
- Phase 3 delivered `parseGpx(text): ParseResult` in `src/parser` with codes `invalid-xml`, `not-gpx`, `no-points` and user-facing messages.
- Fixtures in `src/test/fixtures` (`run.gpx`, `bike.gpx`, `no-ele-time.gpx`); real recordings in `GpxFiles/` are git-ignored and used only for manual checks.
- ESLint already blocks `model`/`parser`/`metrics` from importing UI or React.
