import { expect, test } from '@playwright/test'
import {
  BIKE_GPX,
  brush,
  canvasBox,
  horizontalOverflow,
  hover,
  loadTrack,
  NO_ELE_TIME_GPX,
  summaryStat,
  tooltipAt,
  trackPage,
  wheelZoomIn,
} from './helpers.ts'

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 3600 } })

  test('run.gpx: heart rate and cadence charts and stats', async ({ page }) => {
    const { unexpected, consoleErrors } = await loadTrack(page)
    const { heartRate, cadence } = trackPage(page)
    await expect(heartRate.locator('canvas')).toHaveCount(1)
    await expect(cadence.locator('canvas')).toHaveCount(1)
    expect(await tooltipAt(page, heartRate, 0.5)).toMatch(/ · \d{2,3} bpm$/)
    expect(await tooltipAt(page, cadence, 0.5)).toMatch(/ · \d{1,3} rpm$/)

    await expect(summaryStat(page, 'Max HR')).toHaveText('159 bpm')
    await expect(summaryStat(page, 'Avg cadence')).toHaveText('69 rpm')
    await expect(summaryStat(page, 'Max cadence')).toHaveText('79 rpm')

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('bike.gpx: heart rate chart with the slider, no cadence', async ({ page }) => {
    await loadTrack(page, BIKE_GPX)
    const { heartRate, cadence, speed } = trackPage(page)
    await expect(heartRate.locator('canvas')).toHaveCount(1)
    await expect(cadence).toHaveCount(0)
    await expect(summaryStat(page, 'Max HR')).toHaveText('166 bpm')
    await expect(summaryStat(page, 'Avg cadence')).toHaveCount(0)

    // The slider's extra room makes the heart rate canvas taller than the speed canvas.
    const hr = await canvasBox(heartRate)
    const sp = await canvasBox(speed)
    expect(hr.height).toBeGreaterThan(sp.height)
  })

  test('no-ele-time.gpx: neither chart', async ({ page }) => {
    await loadTrack(page, NO_ELE_TIME_GPX)
    const { elevation, heartRate, cadence } = trackPage(page)
    await expect(elevation).toBeVisible()
    await expect(heartRate).toHaveCount(0)
    await expect(cadence).toHaveCount(0)
  })

  test('the sensor charts link with the map, the selection and the zoom', async ({ page }) => {
    await loadTrack(page)
    const { heartRate, cadence, marker, highlight, selectionLine } = trackPage(page)
    await expect(cadence.locator('canvas')).toHaveCount(1)

    await hover(page, cadence, 0.4)
    await expect(marker).toBeVisible()
    await page.mouse.move(5, 5)
    await expect(marker).toHaveCount(0)

    await brush(page, heartRate, 0.3, 0.6)
    await expect(highlight).toHaveCount(1)
    await expect(selectionLine).toBeVisible()
    await page.keyboard.press('Escape')

    await wheelZoomIn(page, heartRate)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('run.gpx: four charts and nine stats without horizontal scroll', async ({ page }) => {
    await loadTrack(page)
    const { cadence, stats } = trackPage(page)
    await expect(cadence.locator('canvas')).toHaveCount(1)
    await expect(stats.locator('dt')).toHaveCount(9)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  })
})
