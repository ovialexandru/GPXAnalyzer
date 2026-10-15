import type { Locator, Page } from '@playwright/test'
import path from 'node:path'

const FIXTURES = path.join(import.meta.dirname, '../src/test/fixtures')
export const RUN_GPX = path.join(FIXTURES, 'run.gpx')
export const BIKE_GPX = path.join(FIXTURES, 'bike.gpx')
export const NO_ELE_TIME_GPX = path.join(FIXTURES, 'no-ele-time.gpx')

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

/** Move the mouse over a chart's canvas at a fraction of its width, so ECharts shows its tooltip. */
export async function hover(page: Page, chart: Locator, fraction = 0.5) {
  const canvas = chart.locator('canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('chart canvas has no box')
  const y = box.y + box.height / 2
  await page.mouse.move(box.x + box.width * fraction - 5, y)
  await page.mouse.move(box.x + box.width * fraction, y)
}

export async function canvasBox(chart: Locator) {
  const canvas = chart.locator('canvas').first()
  await canvas.scrollIntoViewIfNeeded()
  const box = await canvas.boundingBox()
  if (!box) throw new Error('chart canvas has no box')
  return box
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
