# Tech Stack

| Area | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | Typed Track/Point model shared across parser, metrics, UI |
| Framework | React + Vite | Fast dev server, static build output |
| Map | Leaflet | OSM raster tiles, no API key |
| Charts | Apache ECharts | Built-in dataZoom, brush selection, cross-chart linking |
| GPX parsing | Own parser using browser `DOMParser` | Reads `trkpt`, `ele`, `time`, and HR/cadence extensions; no server |
| State | React context or Zustand | Shared `hoverIndex` and `selectedRange` drive map and charts |
| Unit tests | Vitest | Parser and metrics are pure functions |
| E2E tests | Playwright | Upload -> zoom -> select -> stats |
| Lint/format | ESLint + Prettier | |
| Hosting | Static (GitHub Pages / Netlify / Cloudflare Pages) | No backend |

## Architecture notes
- **No backend.** Everything runs in the browser; files are read via `File`/`FileReader`.
- **Layers:** `parser` (XML -> Track) -> `metrics` (Track -> derived series and stats) -> `ui` (map, charts, panels). Parser and metrics have no UI dependencies.
- **Single source of truth:** the parsed Track plus derived arrays indexed by point index; map and charts refer to points by index.
- **Performance:** downsample for rendering when needed (e.g. ECharts `sampling`/LTTB), but compute stats on full data.

## Conventions
- Pure, unit-tested functions for all calculations (distance via haversine, speed, elevation gain with smoothing/threshold).
- Units stored in SI (meters, seconds); formatting happens only in the UI.
- Small, focused modules; no component over ~200 lines.
