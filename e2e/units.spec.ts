import { expect, test, type Page } from '@playwright/test'
import { brush, hover, RUN_GPX, stubExternalRequests } from './helpers.ts'

test.use({ viewport: { width: 1280, height: 4400 } })

function regions(page: Page) {
  const summary = page.getByRole('region', { name: 'Loaded track' })
  return {
    summary,
    units: page.getByRole('group', { name: 'Units' }),
    elevation: page.getByRole('region', { name: 'Elevation chart' }),
    speed: page.getByRole('region', { name: 'Speed chart' }),
    scale: page.locator('.leaflet-control-scale-line'),
  }
}

function stat(page: Page, label: string) {
  return regions(page)
    .summary.locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    .locator('dd')
}

async function load(page: Page) {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(regions(page).speed.locator('canvas')).toHaveCount(1)
  return unexpected
}

test('Imperial switches the summary, the charts and the scale bar, and survives a reload', async ({
  page,
}) => {
  const unexpected = await load(page)
  const { units, elevation, speed, scale, summary } = regions(page)
  await expect(stat(page, 'Distance')).toHaveText('1.47 km')
  await expect(scale).toHaveText(/ (m|km)$/)

  await brush(page, elevation, 0.3, 0.6)
  const line = summary.getByText(/^Selection · /)
  await expect(line).toHaveText(/ m – /)

  await units.getByRole('radio', { name: 'Imperial' }).check()
  await expect(stat(page, 'Distance')).toHaveText(/ (mi|ft)$/)
  await expect(stat(page, 'Elevation gain')).toHaveText(/^\d+ ft$/)
  await expect(stat(page, 'Max speed')).toHaveText(/^\d+\.\d mph$/)
  await expect(line).toHaveText(/ (ft|mi) – .* (ft|mi)$/)
  await expect(scale).toHaveText(/ (ft|mi)$/)
  // The selection survives the switch.
  await expect(page.locator('path.track-selection')).toHaveCount(1)

  await hover(page, elevation, 0.5)
  await expect(elevation.getByText(/ · /)).toHaveText(/^[\d.]+ mi · \d+ ft$/)
  await hover(page, speed, 0.5)
  await expect(speed.getByText(/ · /)).toHaveText(/ mph$/)

  await page.reload()
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(units.getByRole('radio', { name: 'Imperial' })).toBeChecked()
  await expect(stat(page, 'Distance')).toHaveText('0.91 mi')
  expect(unexpected).toEqual([])
})
