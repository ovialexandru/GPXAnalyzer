# GPX Analyzer

[![CI](https://github.com/ovialexandru/GPXAnalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/ovialexandru/GPXAnalyzer/actions/workflows/ci.yml)

A fast, private web app for exploring and analyzing GPX tracks: upload a file, then view it on a map and on linked charts, zoom in, and get stats for any selected segment. Files are parsed in the browser and never uploaded to a server; there are no accounts and no backend.

**Live:** https://ovialexandru.github.io/GPXAnalyzer/

## Prerequisites

- Node.js 22 or newer (npm 10+)

```sh
npm install
```

## Scripts

| Script                    | Description                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`             | Start the Vite dev server                                                               |
| `npm run build`           | Type-check and build the static app to `dist/`                                          |
| `npm run preview`         | Serve the built `dist/` locally                                                         |
| `npm run lint`            | Run ESLint (fails on any warning)                                                       |
| `npm run format`          | Format all files with Prettier                                                          |
| `npm run format:check`    | Check formatting without writing                                                        |
| `npm test`                | Run unit tests once (Vitest, jsdom)                                                     |
| `npm run test:watch`      | Run unit tests in watch mode                                                            |
| `npm run test:e2e`        | Run the Playwright end-to-end tests (Chromium)                                          |
| `npm run test:e2e:repeat` | Run every end-to-end test 3 times, to catch flaky tests                                 |
| `npm run test:e2e:prod`   | Build, then run the end-to-end tests against the production build under `/GPXAnalyzer/` |
| `npm run test:smoke`      | Run the smoke test against the live site (or `SMOKE_URL`)                               |

## Deploy

The [CI workflow](.github/workflows/ci.yml) runs lint, format check, type check, unit tests, build and the end-to-end tests (dev server and production build) on every pull request and push to `main`. On `main`, once all of that passes, it deploys `dist/` to GitHub Pages and runs the smoke test against the live URL.

One-time setup: in the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

The production build is served under `/GPXAnalyzer/` (`base` in `vite.config.ts`); the dev server stays at `/`.

## Project layout

- `src/parser` – GPX XML to `Track` (no UI dependencies)
- `src/metrics` – derived series and stats (no UI dependencies)
- `src/ui` – React components
- `specs/` – mission, roadmap, tech stack, and per-phase specs
