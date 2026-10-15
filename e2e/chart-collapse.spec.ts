import { expect, test, type Page } from '@playwright/test'
import { brush, RUN_GPX, stubExternalRequests } from './helpers.ts'

test.use({ viewport: { width: 1280, height: 4400 } })

const CHARTS = ['Speed chart', 'Elevation chart', 'Heart rate chart', 'Cadence chart']

function toggle(page: Page, name: string) {
  return page.getByRole('region', { name: `${name} chart` }).getByRole('button', { name })
}

async function load(page: Page) {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(page.getByRole('region', { name: 'Cadence chart' }).locator('canvas')).toHaveCount(1)
  return unexpected
}

test('charts are ordered speed, elevation, heart rate, cadence', async ({ page }) => {
  await load(page)
  const names = await page
    .getByRole('region')
    .evaluateAll((regions) => regions.map((r) => r.getAttribute('aria-label')))
  expect(names.filter((n) => n !== null && CHARTS.includes(n))).toEqual(CHARTS)
})

test('a chart collapses to its heading and comes back with the selection', async ({ page }) => {
  const unexpected = await load(page)
  const elevation = page.getByRole('region', { name: 'Elevation chart' })
  const speed = page.getByRole('region', { name: 'Speed chart' })

  await toggle(page, 'Elevation').click()
  await expect(toggle(page, 'Elevation')).toHaveAttribute('aria-expanded', 'false')
  await expect(elevation.locator('canvas')).toHaveCount(0)

  // Selecting on another chart while it is collapsed.
  await brush(page, speed, 0.3, 0.6)
  await expect(page.locator('path.track-selection')).toHaveCount(1)

  await toggle(page, 'Elevation').click()
  await expect(elevation.locator('canvas')).not.toHaveCount(0)
  await expect(page.locator('path.track-selection')).toHaveCount(1)

  // Remembered after a reload.
  await toggle(page, 'Cadence').click()
  await page.reload()
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(toggle(page, 'Cadence')).toHaveAttribute('aria-expanded', 'false')
  await expect(toggle(page, 'Elevation')).toHaveAttribute('aria-expanded', 'true')
  expect(unexpected).toEqual([])
})
