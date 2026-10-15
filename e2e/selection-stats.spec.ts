import { expect, test, type Page } from '@playwright/test'
import { BIKE_GPX, brush, canvasBox, RUN_GPX, stubExternalRequests, touchBrush } from './helpers.ts'

function regions(page: Page) {
  const summary = page.getByRole('region', { name: 'Loaded track' })
  return {
    summary,
    stats: summary.locator('dl'),
    selectionLine: summary.getByText(/^Selection · /),
    wholeTrack: summary.getByRole('button', { name: 'Show whole track' }),
    elevation: page.getByRole('region', { name: 'Elevation chart' }),
    xAxis: page.getByRole('group', { name: 'X axis' }),
  }
}

/** The text of one summary stat, e.g. "Distance" → "1.47 km". */
function stat(page: Page, label: string) {
  return regions(page)
    .stats.locator('div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    .locator('dd')
}

/** "290 m" / "1.47 km" → meters. */
function meters(text: string): number {
  const value = parseFloat(text.replace(/,/g, ''))
  return text.endsWith(' km') ? value * 1000 : value
}

/** "m:ss" or "h:mm:ss" → seconds. */
function seconds(text: string): number {
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

async function distance(page: Page): Promise<number> {
  return meters((await stat(page, 'Distance').textContent()) ?? '')
}

async function load(page: Page, file = RUN_GPX) {
  const unexpected = await stubExternalRequests(page)
  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.text())
  })
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(page.getByRole('region', { name: 'Speed chart' }).locator('canvas')).toHaveCount(1)
  return { unexpected, consoleErrors }
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 3200 } })

  test('brushing switches the summary to the selection and back', async ({ page }) => {
    const { unexpected, consoleErrors } = await load(page)
    const { stats, selectionLine, wholeTrack, elevation } = regions(page)
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
    await load(page)
    const { selectionLine, elevation } = regions(page)
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
    await load(page, BIKE_GPX)
    const { selectionLine, elevation, xAxis } = regions(page)
    await xAxis.getByRole('radio', { name: 'Time' }).check()
    // The 177 s pause runs from 42 % to 67 % of the time axis.
    await brush(page, elevation, 0.25, 0.85)
    await expect(selectionLine).toBeVisible()

    const duration = seconds((await stat(page, 'Duration').textContent()) ?? '')
    const avgKmh = parseFloat((await stat(page, 'Avg speed').textContent()) ?? '')
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
    await load(page)
    const { selectionLine, wholeTrack, elevation } = regions(page)
    await touchBrush(page, elevation, 0.3, 0.7)
    await expect(selectionLine).toBeVisible()

    await wholeTrack.scrollIntoViewIfNeeded()
    const box = await wholeTrack.boundingBox()
    if (!box) throw new Error('button has no box')
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x + box.width).toBeLessThanOrEqual(375)
    const overflow = await page
      .locator('html')
      .evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    await wholeTrack.tap()
    await expect(selectionLine).toHaveCount(0)
  })
})
