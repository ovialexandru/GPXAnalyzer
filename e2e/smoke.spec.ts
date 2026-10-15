import { expect, test } from '@playwright/test'
import { openPage, summaryStat, trackPage } from './helpers.ts'

// Runs in every suite (dev server, production build) and, through playwright.smoke.config.ts,
// against the live site after each deploy.
test('smoke: the sample track loads with its map, chart and stats', async ({ page }) => {
  const failed: string[] = []
  page.on('requestfailed', (r) => failed.push(r.url()))
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`)
  })
  const { unexpected, consoleErrors } = await openPage(page)

  await page.getByRole('button', { name: 'Try a sample track' }).click()
  const { summary, map, speed } = trackPage(page)
  await expect(summary.getByRole('heading', { name: 'Sample run' })).toBeVisible()
  await expect(summary.getByText('sample.gpx', { exact: true })).toBeVisible()
  await expect(map.locator('canvas')).toBeAttached()
  await expect(speed.locator('canvas')).toBeAttached()
  await expect(summaryStat(page, 'Distance')).toHaveText('1.47 km')
  await expect(summaryStat(page, 'Duration')).toHaveText('10:44')

  // Stubbed OSM tiles and aborted external requests are not own-asset failures.
  expect(failed.filter((url) => !unexpected.some((u) => url.endsWith(u)))).toEqual([])
  expect(unexpected).toEqual([])
  expect(consoleErrors).toEqual([])
})
