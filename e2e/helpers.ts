import { expect, type Locator, type Page } from '@playwright/test'
import path from 'node:path'

const FIXTURES = path.join(import.meta.dirname, '../src/test/fixtures')
export const RUN_GPX = path.join(FIXTURES, 'run.gpx')
export const BIKE_GPX = path.join(FIXTURES, 'bike.gpx')
export const NO_ELE_TIME_GPX = path.join(FIXTURES, 'no-ele-time.gpx')

/** Chart tooltips read "<x> · <y>", e.g. "1.23 km · 245 m" or "10:44 · 12.3 km/h". */
export const TOOLTIP = / · /

/** Tooltip distances are rounded to 10 m, and the charts' window edges may differ by a point. */
export const KM_TOLERANCE = 0.02

// 1×1 transparent PNG served for every OSM tile, so the test is offline and respects the tile policy.
const TILE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/**
 * Serves OSM tiles locally and aborts every other non-localhost request.
 * Returns the list of aborted URLs, which a test should expect to be empty.
 */
export async function stubExternalRequests(page: Page): Promise<string[]> {
  const unexpected: string[] = []
  await page.route(
    (url) => url.hostname !== 'localhost',
    (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === 'tile.openstreetmap.org') {
        return route.fulfill({ contentType: 'image/png', body: TILE_PNG })
      }
      unexpected.push(url.href)
      return route.abort()
    },
  )
  return unexpected
}

/** Locators for the page: summary, map, charts, toolbar and toggles. */
export function trackPage(page: Page) {
  const summary = page.getByRole('region', { name: 'Loaded track' })
  const chart = (name: string) => page.getByRole('region', { name: `${name} chart` })
  return {
    input: page.locator('input[type="file"]'),
    summary,
    stats: summary.locator('dl'),
    selectionLine: summary.getByText(/^Selection · /),
    wholeTrack: summary.getByRole('button', { name: 'Show whole track' }),
    map: page.getByRole('region', { name: 'Track map' }),
    highlight: page.locator('path.track-selection'),
    marker: page.locator('[data-hover-marker]'),
    speed: chart('Speed'),
    elevation: chart('Elevation'),
    heartRate: chart('Heart rate'),
    cadence: chart('Cadence'),
    reset: page.getByRole('button', { name: 'Reset zoom' }),
    zoomToSelection: page.getByRole('button', { name: 'Zoom to selection' }),
    clear: page.getByRole('button', { name: 'Clear selection' }),
    units: page.getByRole('group', { name: 'Units' }),
    xAxis: page.getByRole('group', { name: 'X axis' }),
  }
}

/**
 * Stubs external requests, collects console errors and warnings (ECharts reports
 * misconfiguration this way) and opens the app. A test should expect both lists to stay empty.
 */
export async function openPage(page: Page) {
  const unexpected = await stubExternalRequests(page)
  const consoleErrors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleErrors.push(m.text())
  })
  await page.goto('/')
  return { unexpected, consoleErrors }
}

/** Picks a file and waits for its summary and the speed chart (or the chart's empty state). */
export async function pickFile(page: Page, file: string) {
  const { input, summary, speed } = trackPage(page)
  await input.setInputFiles(file)
  await expect(summary.getByText(path.basename(file), { exact: true })).toBeVisible()
  await expect(speed.locator('canvas').or(speed.getByText(/no timestamps/))).toHaveCount(1)
}

/** `openPage`, then `pickFile`. */
export async function loadTrack(page: Page, file = RUN_GPX) {
  const opened = await openPage(page)
  await pickFile(page, file)
  return opened
}

/** The text of one summary stat, e.g. "Max HR" → "159 bpm". */
export function summaryStat(page: Page, label: string) {
  return trackPage(page)
    .stats.locator('div')
    .filter({ has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) })
    .locator('dd')
}

/** "290 m" / "1.47 km" → meters. */
export function meters(text: string): number {
  const value = parseFloat(text.replace(/,/g, ''))
  return text.endsWith(' km') ? value * 1000 : value
}

/** "m:ss" or "h:mm:ss" → seconds. */
export function seconds(text: string): number {
  return text.split(':').reduce((total, part) => total * 60 + Number(part), 0)
}

/** How far the page scrolls sideways: at most 0 when it fits. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
}

export async function canvasBox(chart: Locator) {
  const canvas = chart.locator('canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('chart canvas has no box')
  return box
}

/** Move the mouse over a chart's canvas at a fraction of its width, so ECharts shows its tooltip. */
export async function hover(page: Page, chart: Locator, fraction = 0.5) {
  const box = await canvasBox(chart)
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * fraction - 5, y)
  await page.mouse.move(box.x + box.width * fraction, y)
}

/** The chart's tooltip text at a fraction of its width. */
export async function tooltipAt(page: Page, chart: Locator, fraction: number): Promise<string> {
  await hover(page, chart, fraction)
  const tooltip = chart.getByText(TOOLTIP)
  await expect(tooltip).toBeVisible()
  return (await tooltip.textContent()) ?? ''
}

/** The tooltip's x value at a fraction of the chart's width: km on the Distance axis, s on the Time axis. */
export async function xAt(page: Page, chart: Locator, fraction: number): Promise<number> {
  const x = (await tooltipAt(page, chart, fraction)).split(' · ')[0].trim()
  if (/^[\d.,]+ (km|m)$/.test(x)) return meters(x) / 1000
  if (!/^\d+(:\d{2})+$/.test(x)) throw new Error(`unexpected tooltip x "${x}"`)
  return seconds(x)
}

/** Mouse drag across a chart's middle, between two fractions of its width. */
export async function brush(page: Page, chart: Locator, from: number, to: number) {
  const box = await canvasBox(chart)
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * from, y)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to, y, { steps: 10 })
  await page.mouse.up()
}

/** Wheel-zoom in over the middle of the chart until Reset is enabled. */
export async function wheelZoomIn(page: Page, chart: Locator) {
  const box = await canvasBox(chart)
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, -200)
    // The inside zoom is throttled and animates for 100 ms.
    await page.waitForTimeout(150)
  }
  await expect(trackPage(page).reset).toBeEnabled()
}

export type TouchPoint = { x: number; y: number; id: number }

/** Touch input through the Chrome DevTools Protocol; `touchPoints` lists the fingers still down. */
export async function touches(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', points: TouchPoint[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
}

/** One-finger drag across a chart's middle. */
export async function touchBrush(page: Page, chart: Locator, from: number, to: number) {
  const box = await canvasBox(chart)
  const at = (f: number) => ({ x: box.x + box.width * f, y: box.y + box.height / 2, id: 0 })
  const send = await touches(page)
  await send('touchStart', [at(from)])
  for (let i = 1; i <= 10; i++) await send('touchMove', [at(from + ((to - from) * i) / 10)])
  await send('touchEnd', [])
}
