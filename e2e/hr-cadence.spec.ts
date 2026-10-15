import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  BIKE_GPX,
  brush,
  canvasBox,
  hover,
  NO_ELE_TIME_GPX,
  RUN_GPX,
  stubExternalRequests,
} from './helpers.ts'

function regions(page: Page) {
  const summary = page.getByRole('region', { name: 'Loaded track' })
  return {
    summary,
    elevation: page.getByRole('region', { name: 'Elevation chart' }),
    speed: page.getByRole('region', { name: 'Speed chart' }),
    heartRate: page.getByRole('region', { name: 'Heart rate chart' }),
    cadence: page.getByRole('region', { name: 'Cadence chart' }),
    marker: page.locator('[data-hover-marker]'),
    highlight: page.locator('path.track-selection'),
    reset: page.getByRole('button', { name: 'Reset zoom' }),
  }
}

/** The text of one summary stat, e.g. "Max HR" → "159 bpm". */
function stat(page: Page, label: string) {
  return regions(page)
    .summary.locator('dl > div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    .locator('dd')
}

/** The chart's tooltip text at a fraction of its width. */
async function tooltipAt(page: Page, chart: Locator, fraction: number): Promise<string> {
  await hover(page, chart, fraction)
  const tooltip = chart.getByText(/ · /)
  await expect(tooltip).toBeVisible()
  return (await tooltip.textContent()) ?? ''
}

async function load(page: Page, file: string) {
  const unexpected = await stubExternalRequests(page)
  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.text())
  })
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(file)
  await expect(regions(page).summary).toBeVisible()
  return { unexpected, consoleErrors }
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 3600 } })

  test('run.gpx: heart rate and cadence charts and stats', async ({ page }) => {
    const { unexpected, consoleErrors } = await load(page, RUN_GPX)
    const { heartRate, cadence } = regions(page)
    await expect(heartRate.locator('canvas')).toHaveCount(1)
    await expect(cadence.locator('canvas')).toHaveCount(1)
    expect(await tooltipAt(page, heartRate, 0.5)).toMatch(/ · \d{2,3} bpm$/)
    expect(await tooltipAt(page, cadence, 0.5)).toMatch(/ · \d{1,3} rpm$/)

    await expect(stat(page, 'Max HR')).toHaveText('159 bpm')
    await expect(stat(page, 'Avg cadence')).toHaveText('69 rpm')
    await expect(stat(page, 'Max cadence')).toHaveText('79 rpm')

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('bike.gpx: heart rate chart with the slider, no cadence', async ({ page }) => {
    await load(page, BIKE_GPX)
    const { heartRate, cadence, speed } = regions(page)
    await expect(heartRate.locator('canvas')).toHaveCount(1)
    await expect(cadence).toHaveCount(0)
    await expect(stat(page, 'Max HR')).toHaveText('166 bpm')
    await expect(stat(page, 'Avg cadence')).toHaveCount(0)

    // The slider's extra room makes the heart rate canvas taller than the speed canvas.
    const hr = await canvasBox(heartRate)
    const sp = await canvasBox(speed)
    expect(hr.height).toBeGreaterThan(sp.height)
  })

  test('no-ele-time.gpx: neither chart', async ({ page }) => {
    await load(page, NO_ELE_TIME_GPX)
    await expect(regions(page).elevation).toBeVisible()
    await expect(regions(page).heartRate).toHaveCount(0)
    await expect(regions(page).cadence).toHaveCount(0)
  })

  test('the sensor charts link with the map, the selection and the zoom', async ({ page }) => {
    await load(page, RUN_GPX)
    const { heartRate, cadence, marker, highlight, reset, summary } = regions(page)
    await expect(cadence.locator('canvas')).toHaveCount(1)

    await hover(page, cadence, 0.4)
    await expect(marker).toBeVisible()
    await page.mouse.move(5, 5)
    await expect(marker).toHaveCount(0)

    await brush(page, heartRate, 0.3, 0.6)
    await expect(highlight).toHaveCount(1)
    await expect(summary.getByText(/^Selection · /)).toBeVisible()
    await page.keyboard.press('Escape')

    const box = await canvasBox(heartRate)
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -200)
    await expect(reset).toBeEnabled()
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

  test('run.gpx: four charts and nine stats without horizontal scroll', async ({ page }) => {
    await load(page, RUN_GPX)
    await expect(regions(page).cadence.locator('canvas')).toHaveCount(1)
    await expect(regions(page).summary.locator('dt')).toHaveCount(9)
    const overflow = await page
      .locator('html')
      .evaluate((html) => html.scrollWidth - html.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
