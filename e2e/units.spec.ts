import { expect, test } from '@playwright/test'
import {
  brush,
  hover,
  loadTrack,
  pickFile,
  RUN_GPX,
  summaryStat,
  TOOLTIP,
  trackPage,
} from './helpers.ts'

test.use({ viewport: { width: 1280, height: 4400 } })

test('Imperial switches the summary, the charts and the scale bar, and survives a reload', async ({
  page,
}) => {
  const { unexpected } = await loadTrack(page)
  const { units, elevation, speed, selectionLine, highlight } = trackPage(page)
  const scale = page.locator('.leaflet-control-scale-line')
  await expect(summaryStat(page, 'Distance')).toHaveText('1.47 km')
  await expect(scale).toHaveText(/ (m|km)$/)

  await brush(page, elevation, 0.3, 0.6)
  await expect(selectionLine).toHaveText(/ m – /)

  await units.getByRole('radio', { name: 'Imperial' }).check()
  await expect(summaryStat(page, 'Distance')).toHaveText(/ (mi|ft)$/)
  await expect(summaryStat(page, 'Elevation gain')).toHaveText(/^\d+ ft$/)
  await expect(summaryStat(page, 'Max speed')).toHaveText(/^\d+\.\d mph$/)
  await expect(selectionLine).toHaveText(/ (ft|mi) – .* (ft|mi)$/)
  await expect(scale).toHaveText(/ (ft|mi)$/)
  // The selection survives the switch.
  await expect(highlight).toHaveCount(1)

  await hover(page, elevation, 0.5)
  await expect(elevation.getByText(TOOLTIP)).toHaveText(/^[\d.]+ mi · \d+ ft$/)
  await hover(page, speed, 0.5)
  await expect(speed.getByText(TOOLTIP)).toHaveText(/ mph$/)

  await page.reload()
  await pickFile(page, RUN_GPX)
  await expect(units.getByRole('radio', { name: 'Imperial' })).toBeChecked()
  await expect(summaryStat(page, 'Distance')).toHaveText('0.91 mi')
  expect(unexpected).toEqual([])
})
