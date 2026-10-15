import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  horizontalOverflow,
  loadTrack,
  openPage,
  touchBrush,
  touches,
  trackPage,
} from './helpers.ts'

test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })

/** One-finger swipe upwards from the middle of `target`, which should scroll the page down. */
async function swipeUp(page: Page, target: Locator) {
  await page.locator('html').evaluate((html) => html.scrollTo(0, 0))
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  if (!box) throw new Error('target has no box')
  const x = box.x + box.width / 2
  // Inside both the target and the viewport.
  const y = Math.min(box.y + box.height / 2, 560)
  const send = await touches(page)
  await send('touchStart', [{ x, y, id: 0 }])
  for (let i = 1; i <= 10; i++) await send('touchMove', [{ x, y: y - i * 15, id: 0 }])
  await send('touchEnd', [])
}

/** Sizes of the visible tappable controls that are smaller than 44 × 44 px. */
async function smallTargets(page: Page): Promise<string[]> {
  const selector = ['main button', 'main label:has(input[type="radio"])', '.leaflet-bar a']
  return page.locator(selector.join(', ')).evaluateAll((elements) => {
    const visible = elements.filter((el) => el.getClientRects().length > 0)
    // Never pass by matching nothing.
    if (visible.length < 2) throw new Error(`only ${visible.length} tappable controls found`)
    return visible
      .map((el) => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width < 44 || r.height < 44)
      .map(
        ({ el, r }) =>
          `${el.textContent?.trim() || el.getAttribute('title')} ${r.width}×${r.height}`,
      )
  })
}

test('empty and error states: no horizontal scroll', async ({ page }) => {
  await openPage(page)
  await expect(page.getByRole('button', { name: 'Try a sample track' })).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  expect(await smallTargets(page)).toEqual([])

  await trackPage(page).input.setInputFiles({
    name: 'a-very-long-file-name-that-could-overflow-a-narrow-phone-screen.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('nope'),
  })
  await expect(page.getByRole('alert')).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  expect(await smallTargets(page)).toEqual([])
})

test('loaded: every control is tap-sized, the map hint shows, no horizontal scroll', async ({
  page,
}) => {
  const { unexpected } = await loadTrack(page)
  expect(await smallTargets(page)).toEqual([])
  await expect(page.getByText('Use two fingers to move or zoom the map.')).toBeVisible()
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

  const { elevation, highlight } = trackPage(page)
  await touchBrush(page, elevation, 0.3, 0.7)
  await expect(highlight).toHaveCount(1)
  expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
  expect(unexpected).toEqual([])
})

test('a one-finger vertical swipe over the map or a chart scrolls the page', async ({ page }) => {
  await loadTrack(page)
  const { map, speed, highlight } = trackPage(page)
  const pane = page.locator('.leaflet-map-pane')
  const before = await pane.getAttribute('style')

  for (const target of [map, speed.locator('canvas').first()]) {
    await swipeUp(page, target)
    await expect
      .poll(() => page.locator('html').evaluate((html) => html.scrollTop))
      .toBeGreaterThan(0)
  }
  // Neither the map moved nor anything got selected.
  expect(await pane.getAttribute('style')).toBe(before)
  await expect(highlight).toHaveCount(0)
})

test('a swipe over a chart keeps the selection', async ({ page }) => {
  await loadTrack(page)
  const { elevation, speed, highlight } = trackPage(page)
  await touchBrush(page, elevation, 0.3, 0.7)
  await expect(highlight).toHaveCount(1)
  const d = await highlight.getAttribute('d')
  await swipeUp(page, speed.locator('canvas').first())
  await expect(highlight).toHaveCount(1)
  expect(await highlight.getAttribute('d')).toBe(d)
})

test('a pinch on the map zooms it', async ({ page }) => {
  await loadTrack(page)
  const { map } = trackPage(page)
  await map.scrollIntoViewIfNeeded()
  const box = await map.boundingBox()
  if (!box) throw new Error('map has no box')
  const zoom = () => page.locator('.leaflet-proxy').getAttribute('style')
  const before = await zoom()
  const cx = box.x + box.width / 2
  const cy = box.y + Math.min(box.height / 2, 300)
  const fingers = (gap: number) => [
    { x: cx - gap, y: cy, id: 0 },
    { x: cx + gap, y: cy, id: 1 },
  ]
  const send = await touches(page)
  await send('touchStart', fingers(20))
  for (let gap = 25; gap <= 120; gap += 5) await send('touchMove', fingers(gap))
  await send('touchEnd', [])
  await expect.poll(zoom).not.toBe(before)
})
