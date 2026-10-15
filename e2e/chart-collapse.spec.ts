import { expect, test, type Page } from '@playwright/test'
import { brush, loadTrack, pickFile, RUN_GPX, trackPage } from './helpers.ts'

test.use({ viewport: { width: 1280, height: 4400 } })

const CHARTS = ['Speed chart', 'Elevation chart', 'Heart rate chart', 'Cadence chart']

function toggle(page: Page, name: string) {
  return page.getByRole('region', { name: `${name} chart` }).getByRole('button', { name })
}

test('charts are ordered speed, elevation, heart rate, cadence', async ({ page }) => {
  await loadTrack(page)
  await expect(trackPage(page).cadence.locator('canvas')).toHaveCount(1)
  const names = await page
    .getByRole('region')
    .evaluateAll((regions) => regions.map((r) => r.getAttribute('aria-label')))
  expect(names.filter((n) => n !== null && CHARTS.includes(n))).toEqual(CHARTS)
})

test('a chart collapses to its heading and comes back with the selection', async ({ page }) => {
  const { unexpected } = await loadTrack(page)
  const { elevation, speed, highlight } = trackPage(page)

  await toggle(page, 'Elevation').click()
  await expect(toggle(page, 'Elevation')).toHaveAttribute('aria-expanded', 'false')
  await expect(elevation.locator('canvas')).toHaveCount(0)

  // Selecting on another chart while it is collapsed.
  await brush(page, speed, 0.3, 0.6)
  await expect(highlight).toHaveCount(1)

  await toggle(page, 'Elevation').click()
  await expect(elevation.locator('canvas')).not.toHaveCount(0)
  await expect(highlight).toHaveCount(1)

  // Remembered after a reload.
  await toggle(page, 'Cadence').click()
  await page.reload()
  await pickFile(page, RUN_GPX)
  await expect(toggle(page, 'Cadence')).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle(page, 'Elevation')).toHaveAttribute('aria-expanded', 'true')
  expect(unexpected).toEqual([])
})
