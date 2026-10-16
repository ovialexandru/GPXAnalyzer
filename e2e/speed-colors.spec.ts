import { expect, test, type Page } from '@playwright/test'
import {
  brush,
  horizontalOverflow,
  NO_ELE_TIME_GPX,
  openPage,
  pickFile,
  summaryStat,
  trackPage,
} from './helpers.ts'

/** Hue bands (degrees) of the stroke colors; the plain line (#1d4ed8) is in `blue`. */
const BANDS = {
  red: [345, 15], // slow, and the finish marker
  orange: [15, 50],
  yellow: [50, 100],
  green: [125, 155], // avg, and the start marker
  teal: [160, 205],
  blue: [210, 235], // fast, and the plain line
} as const

type Band = keyof typeof BANDS

/**
 * Counts the opaque, saturated pixels on the map's canvas per hue band. The tiles are stubbed
 * transparent, so only the track and the start/finish markers are drawn there.
 */
async function strokeHues(page: Page): Promise<Record<Band, number>> {
  const map = trackPage(page).map
  return map
    .locator('.leaflet-overlay-pane canvas')
    .evaluate((canvas: HTMLCanvasElement, bands) => {
      // Read a copy, so the map's own canvas is never read back (Chrome warns after a few reads).
      const copy = document.createElement('canvas')
      copy.width = canvas.width
      copy.height = canvas.height
      const context = copy.getContext('2d', { willReadFrequently: true })!
      context.drawImage(canvas, 0, 0)
      const { data } = context.getImageData(0, 0, copy.width, copy.height)
      const counts = Object.fromEntries(Object.keys(bands).map((b) => [b, 0])) as Record<
        string,
        number
      >
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] < 200) continue
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
        const max = Math.max(r, g, b)
        const d = max - Math.min(r, g, b)
        if (d < 60) continue // white marker borders, gray
        const h =
          60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4)
        for (const [band, [from, to]] of Object.entries(bands)) {
          if (from < to ? h >= from && h < to : h >= from || h < to) counts[band]++
        }
      }
      return counts as Record<keyof typeof bands, number>
    }, BANDS)
}

async function loadSample(page: Page) {
  await page.getByRole('button', { name: 'Try a sample track' }).click()
  await expect(trackPage(page).summary.getByText('sample.gpx', { exact: true })).toBeVisible()
}

/** The sample button is gone once a track is loaded; reload and load it from the empty state. */
async function loadSampleAgain(page: Page) {
  await page.reload()
  await loadSample(page)
}

function trackColor(page: Page) {
  const group = page.getByRole('group', { name: 'Track color' })
  return {
    group,
    plain: group.getByRole('radio', { name: 'Plain' }),
    speed: group.getByRole('radio', { name: 'Speed' }),
    legend: page.getByRole('group', { name: 'Speed colors' }),
  }
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 4400 } })

  test('Plain by default; Speed colors the track red → green → blue and is remembered', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await loadSample(page)
    const { plain, speed, legend } = trackColor(page)
    await expect(plain).toBeChecked()
    await expect(legend).toHaveCount(0)

    // Plain: the blue line, plus the green start and red finish markers only.
    await expect.poll(async () => (await strokeHues(page)).blue).toBeGreaterThan(500)
    const plainHues = await strokeHues(page)
    expect(plainHues.orange + plainHues.yellow + plainHues.teal).toBe(0)

    const scale = page.locator('.leaflet-control-scale-line')
    const fittedScale = await scale.textContent()

    await speed.check()
    await expect(legend).toBeVisible()
    // Speed: the gradient, including the in-between hues the plain line never has.
    await expect.poll(async () => (await strokeHues(page)).yellow).toBeGreaterThan(50)
    const speedHues = await strokeHues(page)
    expect(speedHues.orange).toBeGreaterThan(50)
    expect(speedHues.teal).toBeGreaterThan(50)
    expect(speedHues.red).toBeGreaterThan(plainHues.red + 200)
    expect(speedHues.green).toBeGreaterThan(plainHues.green + 200)
    expect(speedHues.blue).toBeGreaterThan(200)
    expect(speedHues.blue).toBeLessThan(plainHues.blue)
    // The map did not move.
    await expect(scale).toHaveText(fittedScale ?? '')

    // Reload: the choice is remembered.
    await loadSampleAgain(page)
    await expect(trackColor(page).speed).toBeChecked()
    await expect(trackColor(page).legend).toBeVisible()
    await expect.poll(async () => (await strokeHues(page)).yellow).toBeGreaterThan(50)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('the legend shows avg ± 25% of the summary’s Avg speed, in the current units', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await loadSample(page)
    const { speed, legend } = trackColor(page)
    await speed.check()

    const labels = legend.locator('span')
    await expect(labels).toHaveCount(3)
    const avg = (await summaryStat(page, 'Avg speed').textContent()) ?? ''
    expect(avg).toMatch(/^[\d.]+ km\/h$/)
    await expect(labels.nth(1)).toHaveText(`avg ${avg}`)
    const value = (text: string | null) => parseFloat((text ?? '').replace(/^\D+/, ''))
    expect(value(await labels.nth(0).textContent())).toBeCloseTo(parseFloat(avg) * 0.75, 0)
    expect(value(await labels.nth(2).textContent())).toBeCloseTo(parseFloat(avg) * 1.25, 0)
    await expect(labels.nth(0)).toHaveText(/^≤ [\d.]+ km\/h$/)
    await expect(labels.nth(2)).toHaveText(/^≥ [\d.]+ km\/h$/)

    await trackPage(page).units.getByRole('radio', { name: 'Imperial' }).check()
    const avgMph = (await summaryStat(page, 'Avg speed').textContent()) ?? ''
    expect(avgMph).toMatch(/^[\d.]+ mph$/)
    await expect(labels.nth(1)).toHaveText(`avg ${avgMph}`)
    await expect(labels.nth(0)).toHaveText(/^≤ [\d.]+ mph$/)
    await expect(labels.nth(2)).toHaveText(/^≥ [\d.]+ mph$/)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('Speed mode: a selection shows in its speed colors, not orange', async ({ page }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await loadSample(page)
    const { speed, plain } = trackColor(page)
    const { highlight, speed: speedChart } = trackPage(page)

    await brush(page, speedChart, 0.2, 0.8)
    await expect(highlight).toHaveCount(1)
    await expect(highlight).toHaveAttribute('stroke', '#ea580c')

    await speed.check()
    await expect.poll(() => highlight.count()).toBeGreaterThan(3)
    const strokes = await highlight.evaluateAll((paths) =>
      paths.map((p) => p.getAttribute('stroke')),
    )
    expect(strokes).not.toContain('#ea580c')
    expect(new Set(strokes).size).toBeGreaterThan(3)
    await expect(trackPage(page).selectionLine).toBeVisible()

    await plain.check()
    await expect(highlight).toHaveCount(1)
    await expect(highlight).toHaveAttribute('stroke', '#ea580c')

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('a track without timestamps: Speed is disabled and the plain line is drawn', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await loadSample(page)
    await trackColor(page).speed.check()

    await pickFile(page, NO_ELE_TIME_GPX)
    const { plain, speed, legend } = trackColor(page)
    await expect(speed).toBeDisabled()
    await expect(plain).toBeChecked()
    await expect(legend).toHaveCount(0)
    await expect.poll(async () => (await strokeHues(page)).blue).toBeGreaterThan(200)
    expect((await strokeHues(page)).yellow).toBe(0)

    // The choice is kept for the next timed track.
    await loadSampleAgain(page)
    await expect(trackColor(page).speed).toBeChecked()

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('toggle and legend fit a 360 px screen', async ({ page }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await loadSample(page)
    const { group, speed, legend } = trackColor(page)
    await speed.check()
    await expect(legend).toBeVisible()

    for (const option of await group.locator('label').all()) {
      const box = await option.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    const boxes = await legend
      .locator('span')
      .evaluateAll((spans) =>
        spans.map((s) => s.getBoundingClientRect()).map((r) => ({ left: r.left, right: r.right })),
      )
    expect(boxes).toHaveLength(3)
    expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].left)
    expect(boxes[1].right).toBeLessThanOrEqual(boxes[2].left)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
