# Plan – Phase 17: Deploy

Goal: public static site (see `specs/roadmap.md`, Phase 17). Details and decisions in `requirements.md`.

## 1. Base path
1. In `vite.config.ts`, set `base: '/GPXAnalyzer/'` when `command === 'build'`; dev stays at `/`.
2. Run `npm run build` and check `dist/index.html`: bundle, CSS and favicon URLs all start with `/GPXAnalyzer/`.
3. Run `npm run preview`, open `http://localhost:4173/GPXAnalyzer/`, load the sample track by hand: no 404s in the network tab.

## 2. E2E against the production build
1. Replace `page.goto('/')` with `page.goto('./')` in `e2e/helpers.ts`, `elevation-chart`, `map`, `speed-chart` and `upload` specs.
2. Make `stubExternalRequests` treat the page's own origin as local, not only `localhost`.
3. Add `playwright.prod.config.ts` (preview server on port 4174, `baseURL` with `/GPXAnalyzer/`), and the `test:e2e:prod` script.
4. In `playwright.config.ts`, set `retries: 0` and `trace: 'retain-on-failure'`.
5. Run `npm run test:e2e` and `npm run test:e2e:prod`: both pass with the same tests. If the prod build finds a bug, fix it in its own commit and note it under "Findings" in `requirements.md`.

## 3. Smoke test
1. Add `e2e/smoke.spec.ts` (sample track → heading, file name, map track, Speed chart, Distance and Duration, no console errors, no failed own-asset requests). Record the sample's Distance and Duration in `requirements.md`.
2. Add `playwright.smoke.config.ts` (`testMatch: 'smoke.spec.ts'`, no web server, `baseURL` from `SMOKE_URL` defaulting to the live URL) and the `test:smoke` script.
3. Check it locally against the preview server: `SMOKE_URL=http://localhost:4173/GPXAnalyzer/ npm run test:smoke`.

## 4. CI workflow
1. Add `.github/workflows/ci.yml` with the `check`, `deploy` and `smoke` jobs, triggers, permissions and concurrency from `requirements.md`.
2. Cache Playwright browsers keyed on the `@playwright/test` version; upload `playwright-report/` as an artifact on failure.
3. Add `playwright-report/` to `.gitignore` if it is not ignored yet.
4. Push the branch, open a PR: `check` passes, `deploy` and `smoke` are skipped.

## 5. Docs
1. README: live URL, CI status badge, the new scripts (`test:e2e:prod`, `test:smoke`) in the scripts table, and a short "Deploy" section (runs on `main`, one-time Pages setting "Source: GitHub Actions").

## 6. Verification and release
1. Run `npm run lint`, `npm run format:check`, `npx tsc -b`, `npm test`, `npm run test:e2e`, `npm run test:e2e:repeat`, `npm run test:e2e:prod`, `npm run build`.
2. Walk through `validation.md`.
3. Tick the Phase 17 checkboxes in `specs/roadmap.md`.
4. After the user merges (and has set the Pages source): the `main` run deploys and `smoke` passes against the live URL; open the URL on a phone once.
