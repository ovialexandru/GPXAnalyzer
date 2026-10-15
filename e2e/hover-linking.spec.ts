import { expect, test, type Locator, type Page } from '@playwright/test'
import { hover, RUN_GPX, stubExternalRequests } from './helpers.ts'

function regions(page: Page) {
  return {
    map: page.getByRole('region', { name: 'Track map' }),
    elevation: page.getByRole('region', { name: 'Elevation chart' }),
    speed: page.getByRole('region', { name: 'Speed chart' }),
    marker: page.locator('[data-hover-marker]'),
  }
}

async function center(locator: Locator) {
  const box = await locator.boundingBox()
  if (!box) throw new Error('element has no box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Chart tooltips read "<x> · <y>", e.g. "1.23 km · 245 m". */
const TOOLTIP = / · /

/** Loads run.gpx and checks the whole page fits the viewport, so no step scrolls under the mouse. */
async function loadRun(page: Page) {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  await expect(regions(page).speed.locator('canvas')).toHaveCount(1)
  const overflow = await page
    .locator('html')
    .evaluate((html) => html.scrollHeight - html.clientHeight)
  expect(overflow, 'page must fit the viewport').toBeLessThanOrEqual(0)
  return unexpected
}

test.describe('desktop', () => {
  // The map is 60vh tall, so the page fits only when the viewport is tall enough for the rest too.
  test.use({ viewport: { width: 1280, height: 4400 } })

  test('chart hover moves the map marker; leaving the chart removes it', async ({ page }) => {
    const unexpected = await loadRun(page)
    const { elevation, marker } = regions(page)
    await expect(marker).toHaveCount(0)

    await hover(page, elevation, 0.25)
    await expect(marker).toBeVisible()
    const first = await center(marker)

    await hover(page, elevation, 0.75)
    await expect.poll(async () => (await center(marker)).x).not.toBeCloseTo(first.x, 0)

    await page.mouse.move(5, 5)
    await expect(marker).toHaveCount(0)

    expect(unexpected).toEqual([])
  })

  test('map hover shows the marker and both chart pointers, without a tooltip', async ({
    page,
  }) => {
    const unexpected = await loadRun(page)
    const { map, elevation, speed, marker } = regions(page)

    // Find a spot on the track: where the marker sits for a chart hover.
    await hover(page, elevation, 0.4)
    await expect(marker).toBeVisible()
    const spot = await center(marker)
    await page.mouse.move(5, 5)
    await expect(marker).toHaveCount(0)

    const elevationCanvas = elevation.locator('canvas').first()
    const speedCanvas = speed.locator('canvas').first()
    const idle = [await elevationCanvas.screenshot(), await speedCanvas.screenshot()]

    await page.mouse.move(spot.x - 3, spot.y)
    await page.mouse.move(spot.x, spot.y)
    await expect(marker).toBeVisible()
    const shown = await center(marker)
    expect(Math.abs(shown.x - spot.x)).toBeLessThan(8)
    expect(Math.abs(shown.y - spot.y)).toBeLessThan(8)

    // The axis pointer is drawn on both canvases.
    await expect.poll(async () => (await elevationCanvas.screenshot()).equals(idle[0])).toBe(false)
    await expect.poll(async () => (await speedCanvas.screenshot()).equals(idle[1])).toBe(false)
    await expect(elevation.getByText(TOOLTIP)).toBeHidden()
    await expect(speed.getByText(TOOLTIP)).toBeHidden()

    // Away from the track the marker goes: the top-right corner lies outside the fit padding.
    const mapBox = await map.boundingBox()
    if (!mapBox) throw new Error('map has no box')
    await page.mouse.move(mapBox.x + mapBox.width - 8, mapBox.y + 8)
    await expect(marker).toHaveCount(0)

    expect(unexpected).toEqual([])
  })

  test('only the hovered chart shows its tooltip', async ({ page }) => {
    await loadRun(page)
    const { elevation, speed } = regions(page)

    await hover(page, elevation, 0.5)
    await expect(elevation.getByText(TOOLTIP)).toBeVisible()
    await expect(speed.getByText(TOOLTIP)).toBeHidden()
  })

  test('the speed chart links too, on both the Distance and Time axes', async ({ page }) => {
    const unexpected = await loadRun(page)
    const { elevation, speed, marker } = regions(page)

    await hover(page, speed, 0.3)
    await expect(marker).toBeVisible()
    const distanceSpot = await center(marker)
    await hover(page, speed, 0.7)
    await expect.poll(async () => (await center(marker)).x).not.toBeCloseTo(distanceSpot.x, 0)

    await page.getByRole('group', { name: 'X axis' }).getByRole('radio', { name: 'Time' }).check()
    await hover(page, speed, 0.3)
    await expect(marker).toBeVisible()
    const timeSpot = await center(marker)
    await hover(page, elevation, 0.7)
    await expect.poll(async () => (await center(marker)).x).not.toBeCloseTo(timeSpot.x, 0)

    expect(unexpected).toEqual([])
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('a tap on a chart shows the marker; no horizontal scroll', async ({ page }) => {
    const unexpected = await stubExternalRequests(page)
    await page.goto('/')
    await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
    const { elevation, marker } = regions(page)
    const canvas = elevation.locator('canvas').first()
    await expect(canvas).toBeVisible()
    await canvas.scrollIntoViewIfNeeded()

    const box = await canvas.boundingBox()
    if (!box) throw new Error('chart canvas has no box')
    await canvas.tap({ position: { x: box.width * 0.5, y: box.height / 2 } })
    await expect(marker).toBeVisible()

    const overflow = await page
      .locator('html')
      .evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
  })
})
