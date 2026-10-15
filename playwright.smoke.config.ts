import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

// Only the smoke test, against an already running site: the live GitHub Pages URL by default,
// or SMOKE_URL (CI passes the URL it just deployed; locally e.g. a `vite preview`).
// The trailing slash matters: specs open './', which must stay under /GPXAnalyzer/.
const URL = (process.env.SMOKE_URL ?? 'https://ovialexandru.github.io/GPXAnalyzer/').replace(
  /\/?$/,
  '/',
)

export default defineConfig({
  ...base,
  testMatch: 'smoke.spec.ts',
  use: { ...base.use, baseURL: URL },
  webServer: undefined,
})
