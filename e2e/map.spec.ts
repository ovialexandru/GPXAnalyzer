import { expect, test } from '@playwright/test'
import { BIKE_GPX, RUN_GPX, stubExternalRequests } from './helpers.ts'

test('shows the track on a fitted map', async ({ page }) => {
  const unexpected = await stubExternalRequests(page)

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
