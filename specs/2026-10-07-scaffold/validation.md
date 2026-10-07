# Validation – Phase 1: Scaffold

The implementation succeeded and can be merged when every item below holds on a clean checkout of branch `2026-10-07-scaffold`.

## Automated (all must exit 0)
- [ ] `npm ci` (or `npm install`) completes with no errors.
- [ ] `npm run lint` reports no errors or warnings.
- [ ] `npm run format:check` reports no formatting differences.
- [ ] `npx tsc --noEmit` passes with `strict: true`.
- [ ] `npm test` runs the smoke test (App renders its title) and passes under jsdom.
- [ ] `npm run build` produces `dist/` with no errors.

## Manual
- [ ] `npm run dev` starts the dev server; the page opens in a browser and shows the app title with no console errors.
- [ ] `npm run preview` serves the built `dist/` correctly.
- [ ] Page has a viewport meta tag in `index.html`.

## Structure and hygiene
- [ ] `src/parser`, `src/metrics`, `src/ui` exist; `parser` and `metrics` import nothing from `ui`.
- [ ] `.gitignore` excludes `node_modules` and `dist`; neither is committed.
- [ ] `README.md` documents prerequisites and the npm scripts.
- [ ] No dependencies beyond the scaffold (no Leaflet, ECharts, Zustand, Playwright); no backend code.
- [ ] Existing `specs/` files are unchanged except for the Phase 1 checkboxes in `specs/roadmap.md`.

## Merge gate
- [ ] All Phase 1 checkboxes in `specs/roadmap.md` are ticked.
- [ ] The app is in a working, shippable state (mission principle: small steps).
