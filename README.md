# GPX Analyzer

[![CI](https://github.com/ovialexandru/GPXAnalyzer/actions/workflows/ci.yml/badge.svg)](https://github.com/ovialexandru/GPXAnalyzer/actions/workflows/ci.yml)

A fast, private web app for exploring and analyzing GPX tracks: upload a file, then view it on a map and on linked charts, zoom in, and get stats for any selected segment. Files are parsed in the browser and never uploaded to a server; there are no accounts and no backend.

**Live:** https://ovialexandru.github.io/GPXAnalyzer/

The map can draw the track in one color or colored by speed: red where it was slower than the average moving speed − 25%, green around the average, blue faster than average + 25%, blending in between, with a legend under the map. The thresholds, colors and smoothing are set in [`src/settings.ts`](src/settings.ts) and take effect on the next build.

Two tracks can be compared, for example two runs of the same route: drop or choose two files at once, or load one and use **Compare with…** for the second. Track A is drawn in blue and B in orange on the map and on every chart, with a legend. Hover, zoom and selection are linked at the same distance (or elapsed time) from each track's start, and a table shows both tracks' stats side by side, for the whole tracks or for each track's part of the selection. Each track has a chip with a button to remove it. Speed colors are off while comparing. The two colors are `COMPARE_COLORS` in [`src/settings.ts`](src/settings.ts).

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
- `src/settings.ts` – settings edited in the repo (speed-color thresholds and colors, compared tracks' colors)
- `specs/` – mission, roadmap, tech stack, and per-phase specs
