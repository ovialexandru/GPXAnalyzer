import { expect, test } from '@playwright/test'
import { loadTrack, openPage, trackPage } from './helpers.ts'

test.use({ viewport: { width: 1280, height: 1600 } })

test('empty state: intro, privacy note and a sample that loads from the site', async ({ page }) => {
  const { unexpected } = await openPage(page)
  const intro = page.getByRole('region', { name: 'Getting started' })
  await expect(intro).toContainText('never uploaded')
  await expect(page.getByText('Drop a GPX file here or')).toBeVisible()

  await intro.getByRole('button', { name: 'Try a sample track' }).click()
  const { summary } = trackPage(page)
  await expect(summary.getByRole('heading', { name: 'Sample run' })).toBeVisible()
  await expect(summary.getByText('sample.gpx', { exact: true })).toBeVisible()
  await expect(intro).toHaveCount(0)
  await expect(page.getByText('Drop another GPX file here or')).toBeVisible()
  expect(unexpected).toEqual([])
})

test('error state: names the file, can be dismissed, keeps the track', async ({ page }) => {
  await loadTrack(page)
  const { input, summary } = trackPage(page)
  await input.setInputFiles({
    name: 'broken.gpx',
    mimeType: 'application/gpx+xml',
    buffer: Buffer.from('<gpx'),
  })
  const alert = page.getByRole('alert')
  await expect(alert.getByText("Couldn't open broken.gpx")).toBeVisible()
  await alert.getByRole('button', { name: 'Dismiss' }).click()
  await expect(alert).toHaveCount(0)
  await expect(summary).toBeVisible()
})

test('layout: a 64 rem column on desktop, the map between 280 and 600 px tall', async ({
  page,
}) => {
  await loadTrack(page)
  const main = await page.locator('main').boundingBox()
  // 64 rem of content plus the 16 px gutters.
  expect(main?.width).toBe(64 * 16 + 2 * 16)
  const map = await trackPage(page).map.boundingBox()
  expect(map?.height).toBeGreaterThanOrEqual(280)
  expect(map?.height).toBeLessThanOrEqual(600)
  // A fine pointer: no touch hint.
  await expect(page.getByText('Use two fingers to move or zoom the map.')).toBeHidden()
})
