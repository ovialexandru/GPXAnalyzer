import { expect, test, type Page } from '@playwright/test'
import {
  BIKE_GPX,
  brush,
  canvasBox,
  horizontalOverflow,
  loadTrack,
  meters,
  seconds,
  summaryStat,
  touchBrush,
  trackPage,
} from './helpers.ts'

async function distance(page: Page): Promise<number> {
  return meters((await summaryStat(page, 'Distance').textContent()) ?? '')
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 3200 } })

  test('brushing switches the summary to the selection and back', async ({ page }) => {
    const { unexpected, consoleErrors } = await loadTrack(page)
    const { stats, selectionLine, wholeTrack, elevation } = trackPage(page)
    await expect(stats).toHaveAttribute('aria-label', 'Whole-track stats')
    await expect(selectionLine).toHaveCount(0)
    const whole = await distance(page)

    await brush(page, elevation, 0.3, 0.6)
    await expect(selectionLine).toBeVisible()
    await expect(stats).toHaveAttribute('aria-label', 'Selection stats')
    const narrow = await distance(page)
    expect(narrow).toBeLessThan(whole)

    // A wider brush gives a longer distance: the stats follow the brush.
    await brush(page, elevation, 0.1, 0.9)
    await expect.poll(() => distance(page)).toBeGreaterThan(narrow)

    await wholeTrack.click()
    await expect(selectionLine).toHaveCount(0)
    await expect(stats).toHaveAttribute('aria-label', 'Whole-track stats')
    expect(await distance(page)).toBe(whole)

    await brush(page, elevation, 0.4, 0.7)
    await expect(selectionLine).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(selectionLine).toHaveCount(0)
    expect(await distance(page)).toBe(whole)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('the stats update during the drag, before release', async ({ page }) => {
    await loadTrack(page)
    const { selectionLine, elevation } = trackPage(page)
    const box = await canvasBox(elevation)
    const y = box.y + box.height / 2
    await page.mouse.move(box.x + box.width * 0.2, y)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.4, y, { steps: 5 })
    await expect(selectionLine).toBeVisible()
    const first = await distance(page)
    await page.mouse.move(box.x + box.width * 0.8, y, { steps: 5 })
    await expect.poll(() => distance(page)).toBeGreaterThan(first)
    await page.mouse.up()
  })

  test('bike.gpx on the Time axis: duration includes the pause, avg speed excludes it', async ({
    page,
  }) => {
    await loadTrack(page, BIKE_GPX)
    const { selectionLine, elevation, xAxis } = trackPage(page)
    await xAxis.getByRole('radio', { name: 'Time' }).check()
    // The 177 s pause runs from 42 % to 67 % of the time axis.
    await brush(page, elevation, 0.25, 0.85)
    await expect(selectionLine).toBeVisible()

    const duration = seconds((await summaryStat(page, 'Duration').textContent()) ?? '')
    const avgKmh = parseFloat((await summaryStat(page, 'Avg speed').textContent()) ?? '')
    expect(duration).toBeGreaterThan(177)
    // Distance over the whole duration (pause included) is clearly below the moving average.
    const overall = ((await distance(page)) / duration) * 3.6
    expect(avgKmh).toBeGreaterThan(overall * 1.3)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('a finger drag shows selection stats; the line wraps without horizontal scroll', async ({
    page,
  }) => {
    await loadTrack(page)
    const { selectionLine, wholeTrack, elevation } = trackPage(page)
    await touchBrush(page, elevation, 0.3, 0.7)
    await expect(selectionLine).toBeVisible()

    await wholeTrack.scrollIntoViewIfNeeded()
    const box = await wholeTrack.boundingBox()
    if (!box) throw new Error('button has no box')
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    await wholeTrack.tap()
    await expect(selectionLine).toHaveCount(0)
  })
})
