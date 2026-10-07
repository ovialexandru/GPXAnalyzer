# Plan – Phase 1: Scaffold

Goal: empty app builds and tests run (see `specs/roadmap.md`, Phase 1). Stack per `specs/techstack.md`.

## 1. Project creation
1. Generate a Vite + React + TypeScript project (`react-ts` template) in the repo root, keeping `specs/` untouched.
2. Set `tsconfig` to `strict: true` (plus `noUnusedLocals`, `noUnusedParameters`).
3. Replace template demo content with a minimal `App` component (title only).
4. Ensure `index.html` has the standard viewport meta tag.

## 2. Lint and format
1. Add ESLint (flat config) with typescript-eslint, react-hooks, and react-refresh rules.
2. Add Prettier and `eslint-config-prettier` so the two do not conflict.
3. Add `.prettierrc` and scripts: `lint`, `format`, `format:check`.

## 3. Testing
1. Add Vitest configured with the `jsdom` environment (DOMParser is needed by the Phase 3 parser).
2. Add `@testing-library/react`, `@testing-library/jest-dom`, and a `src/test/setup.ts` setup file.
3. Write one smoke test that renders `App` and asserts the title is present.
4. Add scripts: `test` (single run), `test:watch`.

## 4. Source structure
1. Create placeholder folders matching the layers in techstack: `src/parser`, `src/metrics`, `src/ui`.
2. Each folder gets a minimal `index.ts` (or `.gitkeep`) so the layout is committed; no logic yet.
3. Move `App` into `src/ui` and keep `main.tsx` as the entry point.

## 5. Repo hygiene
1. Add `.gitignore` (`node_modules`, `dist`, coverage, editor files, `.env*`).
2. Add `README.md`: one-paragraph purpose (from `specs/mission.md`), prerequisites (Node 22), and the scripts table.

## 6. Verification
1. Run `npm install`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, `npm run dev`.
2. Fix any failures; walk through `validation.md`.
3. Tick the Phase 1 checkboxes in `specs/roadmap.md`.
