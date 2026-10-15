# Validation – Phase 17: Deploy

The implementation succeeded and can be merged when every item under "Before merge" holds on a clean checkout of branch `2026-10-15-deploy`. The phase is done when "After merge" also holds.

## Before merge – local (all must exit 0)
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc -b` passes with `strict: true` (including `e2e/` and the new Playwright configs).
- [ ] `npm test` passes unchanged.
- [ ] `npm run test:e2e` passes on the dev server with no real external requests.
- [ ] `npm run test:e2e:repeat` passes with **zero** failures.
- [ ] `npm run test:e2e:prod` passes: the same tests, against `vite preview` at `/GPXAnalyzer/`.
- [ ] `npm run build` produces `dist/`; every script, stylesheet and favicon URL in `dist/index.html` starts with `/GPXAnalyzer/`.
- [ ] `test:smoke` passes against a local preview (`SMOKE_URL=http://localhost:4173/GPXAnalyzer/`).
- [ ] `npm run dev` still serves the app at `http://localhost:5173/`.

## Before merge – CI on the PR
- [ ] The `check` job runs and passes on the PR: lint, format, typecheck, unit, e2e (dev), build, e2e (prod build).
- [ ] `deploy` and `smoke` are skipped on the PR.
- [ ] Breaking something on purpose makes `check` fail at the matching step (checked once, e.g. a lint error pushed in a throwaway commit, then reverted).
- [ ] When e2e fails, the Playwright report is uploaded as an artifact.

## Design
- [ ] One workflow file; deploy has `needs: check` and only runs for `main`; the Pages artifact is the `dist/` that the prod e2e tested (not rebuilt).
- [ ] Default permissions are `contents: read`; `pages: write` and `id-token: write` appear only on `deploy`. No secrets used.
- [ ] Deploys don't overlap (`concurrency` group); older PR runs are cancelled.
- [ ] Playwright runs with `retries: 0` everywhere.
- [ ] No app code changes besides the base path, unless a bug found by the prod e2e is fixed in its own commit and noted in `requirements.md`.
- [ ] No new npm dependencies.
- [ ] README shows the live URL, CI badge, new scripts and the one-time Pages setting.

## After merge (phase done)
- [ ] The `main` run passes `check`, `deploy` and `smoke`.
- [ ] `https://ovialexandru.github.io/GPXAnalyzer/` loads; "Try a sample track" shows "Sample run" with the reference Distance and Duration from `requirements.md`; no 404s in the network tab.
- [ ] Uploading a local GPX file on the live site works and sends no request with the file (privacy principle: only OSM tile requests leave the site).
- [ ] The live site works on a phone (layout, touch zoom/selection).

## Merge gate
- [ ] The Phase 17 checkboxes in `specs/roadmap.md` are ticked.
- [ ] Phase 4–16 validations still hold.
- [ ] No files from `GpxFiles/` are committed.
