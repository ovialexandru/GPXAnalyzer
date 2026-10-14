# Requirements – Phase 1: Scaffold

## Scope
From `specs/roadmap.md` Phase 1:
- Vite + React + TypeScript project created.
- ESLint, Prettier, Vitest configured.
- `npm run dev`, `build`, and `test` all pass.

Also included (decided with the user):
- Strict TypeScript and empty layer folders (`src/parser`, `src/metrics`, `src/ui`).
- `.gitignore` and a short `README.md`.
- One placeholder `App` smoke test proving the test pipeline works.

## Out of scope
- Leaflet, ECharts, Zustand, Playwright (added in the phases that need them).
- Track/TrackPoint types and GPX fixtures (Phase 2), parser (Phase 3), any UI beyond a title.
- CI and deployment (Phase 17).
- Mobile-first base CSS (belongs to Phase 15; only the viewport meta tag is added now).

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Package manager | npm | Already installed (npm 10.9.2, Node 22.17); no extra tooling |
| Vitest environment | jsdom | Provides `DOMParser` for the Phase 3 parser tests; most complete DOM |
| Language | TypeScript, `strict` | Per techstack: typed model shared across layers |
| Layout | `src/parser`, `src/metrics`, `src/ui` | Mirrors architecture layers; parser and metrics must not depend on UI |
| Component size | No component over ~200 lines | Techstack convention |
| Branch / directory | `2026-10-07-scaffold` | Spec naming convention `yyyy-mm-dd-feature-name` |

## Context
- `specs/mission.md`: private, browser-only, no backend or accounts; mobile-friendly; small steps (app shippable after each phase). The scaffold must therefore add no server code and no dependencies that are not needed yet.
- `specs/techstack.md`: React + Vite, Vitest for unit tests, ESLint + Prettier, static hosting. Units stored in SI and formatted only in the UI (relevant from Phase 2 onward).
- Repo currently contains only `specs/`; the scaffold is generated at the repo root.
