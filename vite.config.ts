import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site under the repo name (preview mirrors it); dev stays at the root
  base: command === 'build' || isPreview ? '/GPXAnalyzer/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Playwright specs run with `npm run test:e2e`, not Vitest
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
}))
