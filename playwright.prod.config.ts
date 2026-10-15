import { defineConfig } from '@playwright/test'
import base from './playwright.config.ts'

// The same suite against the production build (`dist/`, which must exist) under the
// GitHub Pages base path, so base-path and bundling bugs show up before deploy.
const PORT = 4174
const URL = `http://localhost:${PORT}/GPXAnalyzer/`

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: URL },
  webServer: {
    command: `npm run preview -- --port ${PORT} --strictPort`,
    url: URL,
    reuseExistingServer: !process.env.CI,
  },
})
