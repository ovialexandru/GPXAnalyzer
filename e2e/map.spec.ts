import { expect, test } from '@playwright/test'
import path from 'node:path'

const FIXTURES = path.join(import.meta.dirname, '../src/test/fixtures')
const RUN_GPX = path.join(FIXTURES, 'run.gpx')
const BIKE_GPX = path.join(FIXTURES, 'bike.gpx')

// 1×1 transparent PNG served for every OSM tile, so the test is offline and respects the tile policy.
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

test('shows the track on a fitted map', async ({ page }) => {
  const unexpected: string[] = []
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === 'tile.openstreetmap.org') {
        return route.fulfill({ contentType: 'image/png', body: TILE_PNG })
      }
      unexpected.push(url.href)
      return route.abort()
    },
  )

  await page.goto('/')
  const input = page.locator('input[type="file"]')
  await input.setInputFiles(RUN_GPX)

  const map = page.getByRole('region', { name: 'Track map' })
  await expect(map).toBeVisible()
  await expect(map).toHaveClass(/leaflet-container/)
  await expect(map.locator('canvas')).toBeAttached()
  await expect(map.getByRole('link', { name: 'OpenStreetMap' })).toBeVisible()
  const fit = map.getByRole('button', { name: 'Fit to track' })
  await expect(fit).toBeVisible()
  const fitBox = await fit.boundingBox()
  expect(fitBox?.width).toBeGreaterThanOrEqual(44)
  expect(fitBox?.height).toBeGreaterThanOrEqual(44)

  // Zoom away, then "Fit to track" returns to the fitted view (same scale).
  const scale = map.locator('.leaflet-control-scale-line')
  await expect(scale).not.toBeEmpty()
  const fitted = await scale.textContent()
  const zoomIn = map.getByRole('button', { name: 'Zoom in' })
  await zoomIn.click()
  await expect(scale).not.toHaveText(fitted ?? '')
  await zoomIn.click()
  await fit.click()
  await expect(scale).toHaveText(fitted ?? '')

  // A second file reuses the same map.
  await input.setInputFiles(BIKE_GPX)
  await expect(page.getByRole('heading', { name: 'bike.gpx' })).toBeVisible()
  await expect(page.locator('.leaflet-container')).toHaveCount(1)
  await expect(map.locator('canvas')).toBeAttached()

  expect(unexpected).toEqual([])
})
