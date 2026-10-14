import { expect, test } from '@playwright/test'
import { BIKE_GPX, hover, NO_ELE_TIME_GPX, RUN_GPX, stubExternalRequests } from './helpers.ts'

test('shows the elevation profile, its tooltip and the empty state', async ({ page }) => {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  const input = page.locator('input[type="file"]')
  const chart = page.getByRole('region', { name: 'Elevation chart' })

  await input.setInputFiles(RUN_GPX)
  await expect(chart.getByRole('heading', { name: 'Elevation' })).toBeVisible()
  const canvas = chart.locator('canvas')
  await expect(canvas).toHaveCount(1)
  const box = await canvas.boundingBox()
  expect(box?.width).toBeGreaterThan(0)
  expect(box?.height).toBeGreaterThan(0)

  await hover(page, chart)
  await expect(chart.getByText(/^\d+(\.\d+)? k?m · \d+ m$/)).toBeVisible()

  await input.setInputFiles(NO_ELE_TIME_GPX)
  await expect(chart.getByText('This track has no elevation data.')).toBeVisible()
  await expect(chart.locator('canvas')).toHaveCount(0)

  await input.setInputFiles(BIKE_GPX)
  await expect(page.getByRole('heading', { name: 'bike.gpx' })).toBeVisible()
  await expect(chart.locator('canvas')).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Elevation chart' })).toHaveCount(1)

  expect(unexpected).toEqual([])
})
