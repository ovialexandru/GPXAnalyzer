import { expect, test } from '@playwright/test'
import {
  canvasBox,
  horizontalOverflow,
  KM_TOLERANCE,
  loadTrack,
  trackPage,
  wheelZoomIn,
  xAt,
} from './helpers.ts'

test.describe('desktop', () => {
  // Tall enough for the whole page, so no step scrolls under the mouse.
  test.use({ viewport: { width: 1280, height: 4400 } })

  test('the wheel zooms both charts to the same section; Reset restores the full view', async ({
    page,
  }) => {
    const { unexpected } = await loadTrack(page)
    const { elevation, speed, reset } = trackPage(page)
    await expect(reset).toBeDisabled()
    const full = await xAt(page, elevation, 0.9)

    await wheelZoomIn(page, elevation)
    // The other chart follows within a frame.
    await expect.poll(() => xAt(page, elevation, 0.9)).toBeLessThan(full - 0.05)
    const zoomedElevation = await xAt(page, elevation, 0.9)
    const zoomedSpeed = await xAt(page, speed, 0.9)
    expect(Math.abs(zoomedSpeed - zoomedElevation)).toBeLessThanOrEqual(KM_TOLERANCE)

    await reset.click()
    await expect(reset).toBeDisabled()
    await expect.poll(() => xAt(page, elevation, 0.9)).toBeCloseTo(full, 2)
    expect(await xAt(page, speed, 0.9)).toBeCloseTo(full, 2)

    expect(unexpected).toEqual([])
  })

  test('a plain drag on the plot area does not pan', async ({ page }) => {
    await loadTrack(page)
    const { elevation } = trackPage(page)
    await wheelZoomIn(page, elevation)
    const before = await xAt(page, elevation, 0.5)

    const box = await canvasBox(elevation)
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width * 0.3, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.7, y, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(200)

    expect(await xAt(page, elevation, 0.5)).toBeCloseTo(before, 2)
  })

  test('dragging the slider window pans both charts', async ({ page }) => {
    await loadTrack(page)
    const { elevation, speed, cadence } = trackPage(page)
    await wheelZoomIn(page, elevation)
    const before = await xAt(page, elevation, 0.1)

    // The slider runs under the last chart's plot area (cadence for run.gpx); its window is
    // centred after a centre zoom.
    const box = await canvasBox(cadence)
    const sliderY = box.y + box.height - 19
    const plotLeft = box.x + 64
    const plotWidth = box.width - 64 - 24
    await page.mouse.move(plotLeft + plotWidth * 0.5, sliderY)
    await page.mouse.down()
    await page.mouse.move(plotLeft + plotWidth * 0.65, sliderY, { steps: 10 })
    await page.mouse.up()

    await expect.poll(() => xAt(page, elevation, 0.1)).toBeGreaterThan(before + 0.05)
    const panned = await xAt(page, elevation, 0.1)
    expect(Math.abs((await xAt(page, speed, 0.1)) - panned)).toBeLessThanOrEqual(KM_TOLERANCE)
  })

  test('the Time axis keeps the zoomed section', async ({ page }) => {
    await loadTrack(page)
    const { elevation, xAxis, reset } = trackPage(page)
    await wheelZoomIn(page, elevation)
    const startKm = await xAt(page, elevation, 0.1)
    const endKm = await xAt(page, elevation, 0.9)

    await xAxis.getByRole('radio', { name: 'Time' }).check()
    const startS = await xAt(page, elevation, 0.1)
    const endS = await xAt(page, elevation, 0.9)
    // run.gpx lasts 10:44; the zoomed section is well inside it.
    expect(startS).toBeGreaterThan(30)
    expect(endS).toBeLessThan(644 - 30)
    expect(endS - startS).toBeLessThan(644 * 0.8)

    await xAxis.getByRole('radio', { name: 'Distance' }).check()
    expect(Math.abs((await xAt(page, elevation, 0.1)) - startKm)).toBeLessThanOrEqual(KM_TOLERANCE)
    expect(Math.abs((await xAt(page, elevation, 0.9)) - endKm)).toBeLessThanOrEqual(KM_TOLERANCE)
    await expect(reset).toBeEnabled()
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('the toolbar fits without horizontal scroll; Reset is tap-sized', async ({ page }) => {
    const { unexpected } = await loadTrack(page)
    const { reset } = trackPage(page)
    await reset.scrollIntoViewIfNeeded()

    const box = await reset.boundingBox()
    if (!box) throw new Error('Reset has no box')
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
  })
})
