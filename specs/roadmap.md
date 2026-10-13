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
- [ ] Drag-and-drop and file picker
- [ ] Shows file name and point count
- [ ] Error message for bad files

### Phase 5 – Map
Goal: track visible on a map.
- [ ] Leaflet map with OSM tiles
- [ ] Polyline drawn, map fits bounds
- [ ] Start/end markers

### Phase 6 – Derived metrics
Goal: computed series and totals.
- [ ] Cumulative distance (haversine)
- [ ] Speed and pace series
- [ ] Elevation gain/loss with noise threshold
- [ ] Unit tests

### Phase 7 – Elevation chart
Goal: first chart.
- [ ] ECharts elevation vs distance
- [ ] Handles tracks without elevation (hidden/empty state)

### Phase 8 – Speed/pace chart and axis toggle
Goal: second chart and x-axis choice.
- [ ] Speed/pace chart
- [ ] Toggle x-axis: distance / time

### Phase 9 – Hover linking
Goal: map and charts share a cursor.
- [ ] Hover on chart moves a marker on the map
- [ ] Hover on track shows position on charts

### Phase 10 – Chart zoom
Goal: zoom into a section.
- [ ] dataZoom (wheel/drag + slider)
- [ ] Zoom synced across charts
- [ ] Reset button

### Phase 11 – Range selection
Goal: select a segment.
- [ ] Brush selection on chart
- [ ] Selected segment highlighted on map
- [ ] Clear selection

### Phase 12 – Selection stats
Goal: stats for the selection (or whole track if none).
- [ ] Distance, duration, avg/max speed, avg pace, elevation gain/loss
- [ ] Updates live as selection changes

### Phase 13 – HR and cadence
Goal: optional sensor data.
- [ ] Charts shown only when data exists
- [ ] Avg/max in stats panel

### Phase 14 – Layout and polish
Goal: usable on desktop and mobile.
- [ ] Responsive, mobile-first layout (map + charts + stats stack on narrow screens)
- [ ] Touch support: pinch/drag zoom, touch brush selection, tap-sized controls
- [ ] Playwright checks at a phone viewport
- [ ] Metric/imperial toggle
- [ ] Empty, loading, and error states

### Phase 15 – E2E tests
Goal: protect the main flow.
- [ ] Playwright: upload -> hover -> zoom -> select -> stats visible

### Phase 16 – Deploy
Goal: public static site.
- [ ] CI runs lint, unit, e2e, build
- [ ] Auto-deploy to static host

## Post-MVP

### Sport-specific metrics
- [ ] Per-sport defaults (pace for running, speed for cycling/kayak/windsurf)
- [ ] Splits (per km/mile)
- [ ] Gradient chart and max/avg speed highlights
- [ ] Windsurf/kayak: top speed over N seconds, moving vs stopped time

### Multi-file compare
- [ ] Load several tracks and overlay on map
- [ ] Overlay series on charts with a legend
- [ ] Side-by-side stats
