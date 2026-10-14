import { expect, test, type Locator, type Page } from '@playwright/test'
import { hover, RUN_GPX, stubExternalRequests } from './helpers.ts'

function regions(page: Page) {
  return {
    elevation: page.getByRole('region', { name: 'Elevation chart' }),
    speed: page.getByRole('region', { name: 'Speed chart' }),
    reset: page.getByRole('button', { name: 'Reset zoom' }),
    xAxis: page.getByRole('group', { name: 'X axis' }),
  }
}

/** Chart tooltips read "<x> · <y>", e.g. "1.23 km · 245 m" or "10:44 · 12.3 km/h". */
const TOOLTIP = / · /

/** The tooltip's x value at a fraction of the chart's width: km on the Distance axis, s on the Time axis. */
async function xAt(page: Page, chart: Locator, fraction: number): Promise<number> {
  await hover(page, chart, fraction)
  const tooltip = chart.getByText(TOOLTIP)
  await expect(tooltip).toBeVisible()
  const x = ((await tooltip.textContent()) ?? '').split(' · ')[0].trim()
  const distance = /^([\d.,]+) (km|m)$/.exec(x)
  if (distance) {
    const value = parseFloat(distance[1].replace(/,/g, ''))
    return distance[2] === 'km' ? value : value / 1000
  }
  const parts = x.split(':').map(Number)
  if (parts.length < 2 || parts.some(Number.isNaN)) throw new Error(`unexpected tooltip x "${x}"`)
  return parts.reduce((total, part) => total * 60 + part, 0)
}

/** Tooltip distances are rounded to 10 m, and the charts' window edges may differ by a point. */
const KM_TOLERANCE = 0.02

async function canvasBox(chart: Locator) {
  const box = await chart.locator('canvas').first().boundingBox()
  if (!box) throw new Error('chart canvas has no box')
  return box
}

/** Wheel-zoom in over the middle of the chart until Reset is enabled. */
async function wheelZoomIn(page: Page, chart: Locator) {
  const box = await canvasBox(chart)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -200)
    // The inside zoom is throttled and animates for 100 ms.
    await page.waitForTimeout(150)
  }
  await expect(regions(page).reset).toBeEnabled()
}

async function loadRun(page: Page) {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(regions(page).speed.locator('canvas')).toHaveCount(1)
  return unexpected
}

test.describe('desktop', () => {
  // Tall enough for the whole page, so no step scrolls under the mouse.
  test.use({ viewport: { width: 1280, height: 3200 } })

  test('the wheel zooms both charts to the same section; Reset restores the full view', async ({
    page,
  }) => {
    const unexpected = await loadRun(page)
    const { elevation, speed, reset } = regions(page)
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
    await loadRun(page)
    const { elevation } = regions(page)
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
    await loadRun(page)
    const { elevation, speed } = regions(page)
    await wheelZoomIn(page, elevation)
    const before = await xAt(page, elevation, 0.1)

    // The slider runs under the speed chart's plot area; its window is centred after a centre zoom.
    const box = await canvasBox(speed)
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
    await loadRun(page)
    const { elevation, xAxis } = regions(page)
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
    await expect(regions(page).reset).toBeEnabled()
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('the toolbar fits without horizontal scroll; Reset is tap-sized', async ({ page }) => {
    const unexpected = await loadRun(page)
    const { reset } = regions(page)
    await reset.scrollIntoViewIfNeeded()

    const box = await reset.boundingBox()
    if (!box) throw new Error('Reset has no box')
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(box.x + box.width).toBeLessThanOrEqual(375)

    const overflow = await page
      .locator('html')
      .evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
  })
})
