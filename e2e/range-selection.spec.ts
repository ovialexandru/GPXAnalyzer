import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  BIKE_GPX,
  brush,
  canvasBox,
  horizontalOverflow,
  KM_TOLERANCE,
  loadTrack,
  touchBrush,
  touches,
  trackPage,
  xAt,
} from './helpers.ts'

/** Two-finger spread around a chart's middle. */
async function pinchOut(page: Page, chart: Locator) {
  const box = await canvasBox(chart)
  const cx = box.x + box.width / 2
  const y = box.y + box.height / 2
  const fingers = (gap: number) => [
    { x: cx - gap, y, id: 0 },
    { x: cx + gap, y, id: 1 },
  ]
  const send = await touches(page)
  await send('touchStart', fingers(20).slice(0, 1))
  await send('touchStart', fingers(20))
  for (let gap = 25; gap <= 120; gap += 5) await send('touchMove', fingers(gap))
  await send('touchEnd', [])
}

/** Leaflet's pane and zoom-proxy transforms: any pan or zoom changes them. */
async function mapView(page: Page) {
  const style = (selector: string) => page.locator(selector).getAttribute('style')
  return { pane: await style('.leaflet-map-pane'), proxy: await style('.leaflet-proxy') }
}

test.describe('desktop', () => {
  // Tall enough for the whole page, so no step scrolls under the mouse.
  test.use({ viewport: { width: 1280, height: 3200 } })

  test('a drag on a chart highlights that stretch on the map without moving it', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await loadTrack(page)
    const { elevation, zoomToSelection, clear, highlight } = trackPage(page)
    await expect(zoomToSelection).toBeDisabled()
    await expect(clear).toBeDisabled()
    await expect(highlight).toHaveCount(0)
    const view = await mapView(page)

    await brush(page, elevation, 0.3, 0.6)
    await expect(highlight).toHaveCount(1)
    await expect(highlight).toHaveCSS('stroke', 'rgb(234, 88, 12)')
    await expect(zoomToSelection).toBeEnabled()
    await expect(clear).toBeEnabled()
    expect(await mapView(page)).toEqual(view)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('"Zoom to selection" fits both charts to the brushed stretch', async ({ page }) => {
    await loadTrack(page)
    const { elevation, speed, zoomToSelection, reset, highlight } = trackPage(page)
    const start = await xAt(page, elevation, 0.3)
    const end = await xAt(page, elevation, 0.6)
    await brush(page, elevation, 0.3, 0.6)

    await zoomToSelection.click()
    await expect(reset).toBeEnabled()
    for (const chart of [elevation, speed]) {
      const left = await xAt(page, chart, 0.1)
      const right = await xAt(page, chart, 0.9)
      expect(left).toBeGreaterThanOrEqual(start - KM_TOLERANCE)
      expect(right).toBeLessThanOrEqual(end + KM_TOLERANCE)
      // The window is the selection, not just somewhere inside it.
      expect(right - left).toBeGreaterThan((end - start) * 0.6)
    }

    // Reset zoom keeps the selection.
    await reset.click()
    await expect(highlight).toHaveCount(1)
  })

  test('"Clear selection" and Esc remove the highlight and disable the buttons', async ({
    page,
  }) => {
    await loadTrack(page)
    const { elevation, zoomToSelection, clear, highlight } = trackPage(page)
    await brush(page, elevation, 0.3, 0.6)
    await expect(highlight).toHaveCount(1)

    await clear.click()
    await expect(highlight).toHaveCount(0)
    await expect(clear).toBeDisabled()
    await expect(zoomToSelection).toBeDisabled()

    await brush(page, elevation, 0.4, 0.7)
    await expect(highlight).toHaveCount(1)
    await page.keyboard.press('Escape')
    await expect(highlight).toHaveCount(0)
    await expect(clear).toBeDisabled()
  })

  test('a click on a chart without dragging clears the selection', async ({ page }) => {
    await loadTrack(page)
    const { elevation, speed, highlight } = trackPage(page)
    await brush(page, elevation, 0.3, 0.6)
    await expect(highlight).toHaveCount(1)
    const box = await canvasBox(speed)
    await page.mouse.click(box.x + box.width * 0.8, box.y + box.height / 2)
    await expect(highlight).toHaveCount(0)
  })

  test('brushing the speed chart selects too', async ({ page }) => {
    await loadTrack(page)
    const { speed, clear, highlight } = trackPage(page)
    await brush(page, speed, 0.5, 0.8)
    await expect(highlight).toHaveCount(1)
    await expect(clear).toBeEnabled()
  })

  test('bike.gpx on the Time axis: a band across the pause highlights both segments', async ({
    page,
  }) => {
    await loadTrack(page, BIKE_GPX)
    const { elevation, xAxis, highlight } = trackPage(page)
    await xAxis.getByRole('radio', { name: 'Time' }).check()
    // The pause runs from 42 % to 67 % of the time axis.
    await brush(page, elevation, 0.25, 0.85)
    await expect(highlight).toHaveCount(2)

    // Back on Distance the same points stay selected.
    await xAxis.getByRole('radio', { name: 'Distance' }).check()
    await expect(highlight).toHaveCount(2)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('a one-finger drag selects; the toolbar wraps without horizontal scroll', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await loadTrack(page)
    const { elevation, reset, zoomToSelection, clear, highlight } = trackPage(page)
    await touchBrush(page, elevation, 0.3, 0.7)
    await expect(highlight).toHaveCount(1)
    await expect(clear).toBeEnabled()

    for (const button of [reset, zoomToSelection, clear]) {
      await button.scrollIntoViewIfNeeded()
      const box = await button.boundingBox()
      if (!box) throw new Error('button has no box')
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x + box.width).toBeLessThanOrEqual(375)
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('a pinch still zooms and leaves the selection as it was', async ({ page }) => {
    await loadTrack(page)
    const { elevation, speed, reset, highlight } = trackPage(page)
    await touchBrush(page, speed, 0.3, 0.7)
    await expect(highlight).toHaveCount(1)
    const before = await highlight.getAttribute('d')

    await pinchOut(page, elevation)
    await expect(reset).toBeEnabled()
    await expect(highlight).toHaveCount(1)
    expect(await highlight.getAttribute('d')).toBe(before)
  })
})
