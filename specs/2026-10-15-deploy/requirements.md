# Requirements – Phase 17: Deploy

## Scope
From `specs/roadmap.md` Phase 17 (public static site):
- CI runs lint, unit, e2e, build.
- Auto-deploy to static host.

Today every gate runs only on a developer machine, and the app has no public URL. This phase adds one GitHub Actions workflow that runs the full gate on every PR and on `main`, deploys `main` to GitHub Pages once the gate is green, and then checks that the live site works.

Decided with the user:
- **Host: GitHub Pages.** The repo is already on GitHub (`ovialexandru/GPXAnalyzer`), so no extra account or secrets are needed. Deploy uses the official Pages actions (`configure-pages`, `upload-pages-artifact`, `deploy-pages`).
- **Triggers:** the gate runs on every pull request to `main`, on every push to `main`, and on manual `workflow_dispatch`. Deploy runs only for `main` (push or manual) and only after the whole gate passes.
- **Proof it works:** the e2e suite also runs against the **production build** served by `vite preview` under the real base path, and after each deploy a **live smoke test** opens the public URL, loads the sample track and checks the result.
- Branch and spec directory `2026-10-15-deploy`.

## Out of scope
- Custom domain, HTTPS settings beyond the Pages default, analytics.
- PR preview deployments (Pages has one live site per repo).
- Branch protection rules (worth turning on by hand afterwards; not part of the code).
- Firefox/WebKit in CI, a large-track performance test.
- App feature changes. Only the changes the base path needs are allowed (see below).

## Site and base path
- Live URL: `https://ovialexandru.github.io/GPXAnalyzer/`.
- `vite.config.ts` sets `base: '/GPXAnalyzer/'` **for `vite build` and `vite preview`** (`command === 'build' || isPreview`; preview runs as `serve`, so it needs the flag). The dev server and the existing e2e run stay at `/`.
- Everything the app loads must resolve under the base path: the JS/CSS bundles, `favicon.svg` (Vite rewrites `index.html`) and `sample.gpx` (already uses `import.meta.env.BASE_URL`).
- No client-side routes exist, so no `404.html` / SPA fallback is needed.

## CI workflow (`.github/workflows/ci.yml`)
| Job | Runs when | Steps |
|---|---|---|
| `check` | always | `npm ci`, `lint`, `format:check`, `tsc -b`, `npm test`, `npm run build`, install Playwright Chromium (with deps, browsers cached), `test:e2e` on the dev server, then e2e against `vite preview` of the `dist/` just built; uploads the Playwright report when anything fails; on `main`, uploads that same `dist/` as the Pages artifact |
| `deploy` | `main` only, `needs: check` | `deploy-pages`; exposes `page_url` |
| `smoke` | after `deploy` | Installs Chromium, runs the smoke test against `page_url` |

- Node 22 (matches `engines`), npm cache through `actions/setup-node`.
- Least privilege: `contents: read` by default; `pages: write` and `id-token: write` only on `deploy`.
- `concurrency`: one deploy at a time (`group: pages`, no cancelling of an in-progress deploy); PR runs for the same branch cancel older runs.
- Actions pinned to their current major version.
- **One-time manual step (user):** in the repo settings, Pages → Source = "GitHub Actions". Noted in the README.

## E2E against the production build
- `playwright.prod.config.ts` reuses `playwright.config.ts` and overrides `baseURL` to `http://localhost:4174/GPXAnalyzer/` and `webServer` to `npm run preview -- --port 4174 --strictPort` (needs an existing `dist/`, so CI tests exactly the files it deploys).
- Specs must navigate relative to `baseURL`: `page.goto('/')` → `page.goto('./')` (in `e2e/helpers.ts` and the 4 specs that call it directly). With a path in `baseURL`, `'/'` would drop `/GPXAnalyzer/`.
- `stubExternalRequests` treats the page's own origin as local (not just `localhost`), so the same helper works against the live site.
- Script: `test:e2e:prod` = `npm run build && playwright test -c playwright.prod.config.ts` for local use; CI calls the Playwright command directly after its build step.

## Live smoke test
- `e2e/smoke.spec.ts`, one test: open the page, click "Try a sample track", then check: heading "Sample run", file name `sample.gpx`, map track drawn, Speed chart rendered, the sample's whole-track Distance and Duration (exact values recorded below during implementation), no console errors or warnings, no failed request for the app's own assets, nothing outside the site's origin except OSM tiles.
- It is part of the normal suite, so it is proven on the dev server and on the prod build before it ever runs against the live site.
- `playwright.smoke.config.ts`: `testMatch: 'smoke.spec.ts'`, no `webServer`, `baseURL` from `SMOKE_URL` (default: the live URL). Script: `test:smoke`.
- OSM tiles stay stubbed on the live site too, so CI puts no load on OSM.

Sample reference values (`public/sample.gpx`, metric): Distance `1.47 km`, Duration `10:44`.

## Decisions
| Decision | Choice | Reason |
|---|---|---|
| Host | GitHub Pages | User choice; no extra account or secrets |
| Base path | `/GPXAnalyzer/` for build and preview | Pages project site lives under the repo name; dev and existing e2e stay unchanged |
| Workflow shape | One workflow, `check` → `deploy` → `smoke` | Deploy can only follow a green gate; the deployed `dist/` is the one that was tested |
| Prod e2e | Full suite against `vite preview` | Catches base-path and bundling bugs the dev server hides |
| CI retries | `retries: 0` on CI too, trace `retain-on-failure` | Phase 16 rule: flaky failures are fixed, never retried away; the config's current `retries: 2` on CI is changed |
| Repeat run in CI | Not run on every push | `test:e2e:repeat` stays a local gate; CI runs each suite once to keep runs short |
| CI reporter | `github` plus `html` on CI | The `github` reporter alone writes no `playwright-report/` to upload |
| Action versions | checkout v7, setup-node v7, cache v6, upload-artifact v7, configure-pages v6, upload-pages-artifact v5, deploy-pages v5 | Latest majors on 2026-10-15 |
| Smoke test location | `e2e/smoke.spec.ts` + its own config | Same helpers; verified locally and on the prod build before it guards the live site |

## Findings
- The first prod-build e2e run failed every test: `vite preview` runs with `command: 'serve'`, so a build-only base served `/GPXAnalyzer/` without its bundle (404). Fixed in `vite.config.ts` with `isPreview`; the dev-server run could not have caught it. No app code changed.

## Context
- `specs/mission.md`: private by default (no requests leave the site except map tiles), no backend, small steps.
- `specs/techstack.md`: static hosting, Playwright for E2E, Vite static build output.
- `package.json`: Node ≥ 22; scripts `lint`, `format:check`, `test`, `test:e2e`, `test:e2e:repeat`, `build`, `preview`.
- `playwright.config.ts`: Chromium only, dev server on port 5174, `forbidOnly` and `github` reporter on CI.
- `src/ui/upload/useGpxUpload.ts` already fetches `sample.gpx` via `BASE_URL`; `index.html` links `/favicon.svg`.
- `e2e/helpers.ts`: `openPage`, `loadTrack`, `stubExternalRequests` (routes every non-`localhost` request).
