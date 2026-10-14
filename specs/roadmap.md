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

### Phase 10 – Hover linking
Goal: map and charts share a cursor.
- [ ] Hover on chart moves a marker on the map
- [ ] Hover on track shows position on charts

### Phase 11 – Chart zoom
Goal: zoom into a section.
- [ ] dataZoom (wheel/drag + slider)
- [ ] Zoom synced across charts
- [ ] Reset button

### Phase 12 – Range selection
Goal: select a segment.
- [ ] Brush selection on chart
- [ ] Selected segment highlighted on map
- [ ] Clear selection

### Phase 13 – Selection stats
Goal: stats for the selection (or whole track if none), reusing the Phase 9 stat functions.
- [ ] Distance, duration, avg/max speed, avg pace, elevation gain/loss
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

### Multi-file compare
- [ ] Load several tracks and overlay on map
- [ ] Overlay series on charts with a legend
- [ ] Side-by-side stats
