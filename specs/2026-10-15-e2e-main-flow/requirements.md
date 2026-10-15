# Requirements – Phase 16: E2E tests

## Scope
From `specs/roadmap.md` Phase 16 (protect the main flow):
- Playwright: upload → hover → zoom → select → stats visible.

Each feature already has its own Playwright spec (14 files, 45 tests). What's missing is **one connected run through the main flow**, where a bug in how the features interact (a zoom that loses the selection, stats that don't follow a unit switch, state left over from a previous track) would show up.

Decided with the user:
- **Main flow plus real use:** one test that goes upload → hover → zoom → select → stats, then keeps going the way a user would: zoom to the selection, switch units, clear the selection, and load a second file.
- **Chromium desktop only** (1280 px, mouse). The phone flow stays covered by `e2e/mobile.spec.ts`; no new browsers are downloaded.
- **Shared page helpers:** the `regions()`, `load()`, `stat()` and tooltip helpers that are copied across 8 specs move into `e2e/helpers.ts`. Existing tests keep their behavior.
- **Merge gate:** the full gate, plus the whole e2e suite run 3 times (`--repeat-each=3`) with zero failures, through a new npm script ready for CI (Phase 17).
- Branch and spec directory `2026-10-15-e2e-main-flow`.

## Out of scope
- Firefox and WebKit, real devices, visual (screenshot) comparison.
- A large-track performance test (a later candidate).
- CI configuration (Phase 17).
- New app features or behavior changes: if the main flow finds a bug, it is fixed in a separate commit on this branch and noted here.

## The main flow
`e2e/main-flow.spec.ts`, one test, `run.gpx` then `bike.gpx`, viewport 1280 × 4400 (the whole page fits, so no step scrolls under the mouse). Throughout: no request leaves localhost (OSM tiles stubbed) and no console error or warning.

| Step | Action | Must hold |
|---|---|---|
| 1. Open | Load the page | Empty state: intro, "Try a sample track", Units on Metric |
| 2. Upload | Pick `run.gpx` | Summary heading "Run fixture" with the whole-track reference values (below); map track drawn; four charts in order Speed, Elevation, Heart rate, Cadence; compact drop zone |
| 3. Hover | Mouse over the elevation chart, then away | Tooltip "… km · … m"; the map's hover marker appears and moves with the mouse; it disappears when the mouse leaves |
| 4. Zoom | Wheel-zoom on the speed chart | "Reset zoom" enabled; every chart shows the same narrower distance window (tooltip x at 10 % and 90 % within 0.02 km across charts) |
| 5. Select | Drag across the elevation chart | Map highlight drawn; summary switches to "Selection stats" with the "Selection · a – b" line; stats checked by the invariants below |
| 6. Zoom to selection | Click "Zoom to selection", then "Reset zoom" | The charts' window matches the selection line's range (±0.02 km); after Reset the selection is still shown |
| 7. Units | Switch to Imperial, then back to Metric | Selection line and stats in mi/ft and mph, the selection itself unchanged (same highlight); back on Metric the same metric texts as before |
| 8. Clear | Press Esc | Highlight gone; "Whole-track stats" with exactly the reference values again |
| 9. Second file | Pick `bike.gpx` | Heading "Bike fixture" with its reference values; "Reset zoom" disabled, no selection, no cadence chart |

### Reference values
Whole track, metric (Phases 9, 13, 14):

| File | Distance | Duration | Elevation gain | Avg speed | Max speed | Avg HR | Max HR | Avg cadence | Max cadence |
|---|---|---|---|---|---|---|---|---|---|
| `run.gpx` | 1.47 km | 10:44 | 6 m | 8.2 km/h | 13.6 km/h | 144 bpm | 159 bpm | 69 rpm | 79 rpm |
| `bike.gpx` | 2.52 km | 11:57 | 22 m | 17.5 km/h | 33.7 km/h | 156 bpm | 166 bpm | – | – |

### Selection invariants
A mouse drag selects by pixels, so the exact point range differs slightly between machines and can't be compared with a fixed table. The selection is checked by rules that always hold instead:
- **Span:** the Distance stat equals the selection line's end minus its start, within 10 m (display rounding).
- **Part of the whole:** Distance, Duration and Elevation gain are at most the whole-track values; Max speed, Max HR and Max cadence are at most the whole-track maxima; Avg HR and Avg cadence lie between the selection's plausible bounds (90–200 bpm, 40–100 rpm).
- **Nothing missing:** all nine stats are shown, as for the whole track.

## Shared helpers (`e2e/helpers.ts`)
Moved from the specs, same behavior:
- `trackPage(page)`: locators for the summary, stats `dl`, selection line, map, map highlight, hover marker, each chart region by name, the toolbar buttons and the Units / X axis groups.
- `loadTrack(page, file)`: stubs external requests, collects console errors and warnings, opens `/`, picks the file, waits for the charts; returns `{ unexpected, consoleErrors }`. It is `openPage(page)` (the first three, so the main flow can check the empty state with collection already running) followed by `pickFile(page, file)` (picks the file, waits for its name in the summary and the speed chart or its empty state; also used after a reload or for a second file).
- `summaryStat(page, label)`, `tooltipAt(page, chart, fraction)`, `xAt(page, chart, fraction)` (tooltip x in km, m or s), `meters(text)`, `seconds(text)`, `horizontalOverflow(page)`, `wheelZoomIn(page, chart)`, and the `TOOLTIP` / `KM_TOLERANCE` constants.
- Specs keep local helpers that only they use (e.g. `smallTargets`, `pinchOut`, `mapView`).

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Test shape | One long test with `test.step` per stage | The point is the hand-over between stages; steps keep the report readable and failures pinpointed |
| Browsers | Chromium desktop | User choice; the phone flow is in `mobile.spec.ts` |
| Selection check | Invariants, not a reference table | Pixel-based brushing can't hit an exact index range on every machine; whole-track values are still exact |
| Helpers | One `helpers.ts` | 7 copies of `regions()`, 6 of `load()`, 3 of `stat()` today |
| Flake gate | `--repeat-each=3`, zero failures | User choice; `npm run test:e2e:repeat` for local use and Phase 17 CI |
| File name | `e2e/main-flow.spec.ts` | Says what it protects |

## Findings
The main flow found no app bugs; no app code was changed. Breaking a link on purpose fails the test at the matching step: no `store.setSelection` in `useChartBrush` → Select; "Zoom to selection" resetting the zoom instead → Zoom to selection; Esc not clearing → Clear.

## Context
- `specs/mission.md`: private (no external requests), linked views, mobile-friendly, small steps.
- `specs/techstack.md`: Playwright for E2E "upload → zoom → select → stats".
- `playwright.config.ts`: Chromium only, dev server on port 5174, retries only on CI.
- `e2e/helpers.ts` already has fixture paths, `stubExternalRequests`, `hover`, `canvasBox`, `brush`, `touches`, `touchBrush`.
- Charts are ordered Speed, Elevation, Heart rate, Cadence and can be collapsed (Phase 15 Amendment A); units are remembered in `localStorage` (each Playwright test gets a fresh context).
