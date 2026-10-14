# Roadmap

Vertical slices, each sized for a single focused session. After every phase the app runs and the checklist is verifiable.

## MVP

### Phase 1 – Scaffold
Goal: empty app builds and tests run.
- [x] Vite + React + TS project created
- [x] ESLint, Prettier, Vitest configured
- [x] `npm run dev`, `build`, `test` all pass

### Phase 2 – Data model and fixtures
Goal: shared types and sample data.
- [x] `Track` / `TrackPoint` types (lat, lon, ele?, time?, hr?, cad?)
- [x] 2–3 small GPX fixtures (run, bike, one with no elevation/time)

### Phase 3 – GPX parser
Goal: GPX text -> Track.
- [x] Parses `trkpt`, `ele`, `time`, HR/cadence extensions
- [x] Handles multiple segments and missing fields
- [x] Invalid XML/GPX returns a clear error
- [x] Unit tests on fixtures

### Phase 4 – Upload UI
Goal: user can load a file.
- [x] Drag-and-drop and file picker
- [x] Shows file name and point count
- [x] Error message for bad files

### Phase 5 – Map
Goal: track visible on a map.
- [x] Leaflet map with OSM tiles
- [x] Polyline drawn, map fits bounds
- [x] Start/end markers

### Phase 6 – Derived metrics
Goal: computed series and totals.
- [x] Cumulative distance (haversine)
- [x] Speed and pace series
- [x] Elevation gain/loss with noise threshold
- [x] Unit tests

### Phase 7 – Elevation chart
Goal: first chart.
- [x] ECharts elevation vs distance
- [x] Handles tracks without elevation (hidden/empty state)

### Phase 8 – Speed/pace chart and axis toggle
Goal: second chart and x-axis choice.
- [x] Speed/pace chart
- [x] Toggle x-axis: distance / time

### Phase 9 – Summary stats
Goal: whole-track stats at a glance.
- [x] Track name as the summary heading, file name beside it
- [x] Points and elevation loss removed from the summary
- [x] Avg speed (moving), max speed, avg HR (time-weighted)
- [x] Unit tests
- [x] Amendment A: max speed ignores GPS settle spikes (start-up and after recording gaps)

### Phase 10 – Hover linking
Goal: map and charts share a cursor.
- [x] Hover on chart moves a marker on the map
- [x] Hover on track shows position on charts

### Phase 11 – Chart zoom
Goal: zoom into a section.
- [x] dataZoom (wheel/drag + slider)
- [x] Zoom synced across charts
- [x] Reset button

### Phase 12 – Range selection
Goal: select a segment.
- [x] Brush selection on chart
- [x] Selected segment highlighted on map
- [x] Clear selection

### Phase 13 – Selection stats
Goal: stats for the selection (or whole track if none), reusing the Phase 9 stat functions.
- [ ] Distance, duration, elevation gain, avg/max speed, avg HR (the Phase 9 summary set)
- [ ] Updates live as selection changes

### Phase 14 – HR and cadence
Goal: optional sensor data.
- [ ] Charts shown only when data exists
- [ ] Avg/max in stats panel

### Phase 15 – Layout and polish
Goal: usable on desktop and mobile.
- [ ] Responsive, mobile-first layout (map + charts + stats stack on narrow screens)
- [ ] Touch support: pinch/drag zoom, touch brush selection, tap-sized controls
- [ ] Playwright checks at a phone viewport
- [ ] Metric/imperial toggle
- [ ] Empty, loading, and error states

### Phase 16 – E2E tests
Goal: protect the main flow.
- [ ] Playwright: upload -> hover -> zoom -> select -> stats visible

### Phase 17 – Deploy
Goal: public static site.
- [ ] CI runs lint, unit, e2e, build
- [ ] Auto-deploy to static host

## Post-MVP

### Sport-specific metrics
- [ ] Per-sport defaults (pace for running, speed for cycling/kayak/windsurf)
- [ ] Splits (per km/mile)
- [ ] Gradient chart and max/avg speed highlights
- [ ] Windsurf/kayak: top speed over N seconds, moving vs stopped time

### Trim activity
- [ ] Manually trim irrelevant portions at the start and/or end (e.g. before the real start, after finishing)
- [ ] Trim handles on the chart (reusing range selection), with the trimmed-off parts dimmed on the map
- [ ] Map, charts, and stats recompute from the trimmed track
- [ ] Undo / reset to the original track
- [ ] Export the trimmed track as GPX

### Speed-colored track
- [ ] Polyline colored by speed relative to the track's avg (moving) speed, as a red → green → blue gradient:
  - red: speed below avg − 25%
  - green: speed within avg ± 25%
  - blue: speed above avg + 25%
- [ ] Thresholds (the ±25% bands) and colors editable in a settings file, with the values above as defaults
- [ ] Legend showing the color scale and speed thresholds
- [ ] Toggle between plain and speed-colored polyline

### Desktop view mode
- [ ] Button that switches to a layout optimized for large screens (e.g. map and charts side by side, filling the viewport without page scroll)
- [ ] Map and charts resize to the new layout (map refits bounds, charts redraw)
- [ ] Toggle back to the default layout; choice remembered between visits

### Multi-file compare
- [ ] Load several tracks and overlay on map
- [ ] Overlay series on charts with a legend
- [ ] Side-by-side stats
