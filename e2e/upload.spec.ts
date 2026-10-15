import { expect, test } from '@playwright/test'
import {
  BIKE_GPX,
  horizontalOverflow,
  RUN_GPX,
  stubExternalRequests,
  trackPage,
} from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await stubExternalRequests(page)
})

test('loads a GPX file and then rejects a non-GPX file', async ({ page }) => {
  await page.goto('./')
  const { input, summary } = trackPage(page)

  await input.setInputFiles(RUN_GPX)
  await expect(summary.getByRole('heading', { name: 'Run fixture' })).toBeVisible()
  await expect(summary.getByText('run.gpx', { exact: true })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a gpx file'),
  })
  const alert = page.getByRole('alert')
  await expect(alert.getByText("Couldn't open notes.txt")).toBeVisible()
  await expect(alert.getByText('Please choose a .gpx file.')).toBeVisible()
  // The previous track stays shown.
  await expect(summary.getByRole('heading', { name: 'Run fixture' })).toBeVisible()
})

test('shows the stats of a two-segment track', async ({ page }) => {
  await page.goto('./')
  const { input, summary } = trackPage(page)
  await input.setInputFiles(BIKE_GPX)
  await expect(summary.getByRole('heading', { name: 'Bike fixture' })).toBeVisible()
  await expect(summary.getByText('bike.gpx', { exact: true })).toBeVisible()
  for (const value of ['2.52 km', '11:57', '22 m', '17.5 km/h', '33.7 km/h', '156 bpm']) {
    await expect(summary.getByText(value, { exact: true })).toBeVisible()
  }
  for (const label of ['Track', 'Points', 'Elevation loss']) {
    await expect(summary.getByText(label, { exact: true })).toHaveCount(0)
  }
})

test('no horizontal page scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 })
  await page.goto('./')
  await trackPage(page).input.setInputFiles(BIKE_GPX)
  await expect(page.getByRole('heading', { name: 'Bike fixture' })).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
})
