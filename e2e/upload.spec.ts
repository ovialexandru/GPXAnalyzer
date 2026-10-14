import { expect, test } from '@playwright/test'
import { BIKE_GPX, RUN_GPX, stubExternalRequests } from './helpers.ts'

test.beforeEach(async ({ page }) => {
  await stubExternalRequests(page)
})

test('loads a GPX file and then rejects a non-GPX file', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]')

  await input.setInputFiles(RUN_GPX)
  const summary = page.getByRole('region', { name: 'Loaded track' })
  await expect(summary.getByRole('heading', { name: 'run.gpx' })).toBeVisible()
  await expect(summary.getByText('150', { exact: true })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a gpx file'),
  })
  await expect(page.getByRole('alert')).toHaveText('Please choose a .gpx file.')
  // The previous track stays shown.
  await expect(summary.getByRole('heading', { name: 'run.gpx' })).toBeVisible()
})

test('shows the totals of a two-segment track', async ({ page }) => {
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(BIKE_GPX)
  const summary = page.getByRole('region', { name: 'Loaded track' })
  await expect(summary.getByRole('heading', { name: 'bike.gpx' })).toBeVisible()
  for (const value of ['2.52 km', '11:57', '22 m', '18 m']) {
    await expect(summary.getByText(value, { exact: true })).toBeVisible()
  }
})
