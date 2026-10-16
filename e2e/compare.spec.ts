import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  brush,
  canvasBox,
  horizontalOverflow,
  NO_ELE_TIME_GPX,
  openPage,
  pickFile,
  RUN_B_GPX,
  RUN_GPX,
  tooltipAt,
  trackPage,
  wheelZoomIn,
} from './helpers.ts'

/** Hue bands (degrees) of the two track colors: A #1d4ed8, B #ea580c. */
const BANDS = { blue: [210, 235], orange: [15, 35] } as const

type Hues = Record<keyof typeof BANDS, number>

/**
 * Counts the opaque, saturated pixels per hue band in a canvas, optionally only its top `topPx`
 * CSS pixels. On the map the tiles are stubbed transparent, so only the tracks and markers count.
 */
async function hues(canvas: Locator, topPx?: number): Promise<Hues> {
  return canvas.evaluate(
    (el: HTMLCanvasElement, { bands, topPx }) => {
      // Read a copy, so the page's own canvas is never read back (Chrome warns after a few reads).
      const copy = document.createElement('canvas')
      copy.width = el.width
      copy.height = el.height
      const context = copy.getContext('2d', { willReadFrequently: true })!
      context.drawImage(el, 0, 0)
      const rows =
        topPx === undefined ? copy.height : Math.round(topPx * (el.height / el.clientHeight))
      const { data } = context.getImageData(0, 0, copy.width, rows)
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
        for (const [band, [from, to]] of Object.entries(bands))
          if (h >= from && h < to) counts[band]++
      }
      return counts as Hues
    },
    { bands: BANDS, topPx },
  )
}

function mapHues(page: Page) {
  return hues(trackPage(page).map.locator('.leaflet-overlay-pane canvas'))
}

function compare(page: Page) {
  const section = page.getByRole('region', { name: 'Compared tracks' })
  return {
    section,
    chips: section.getByRole('list', { name: 'Tracks' }).getByRole('listitem'),
    table: section.getByRole('table'),
    button: page.getByRole('button', { name: 'Compare with…' }),
    trackColor: page.getByRole('group', { name: 'Track color' }),
  }
}

/** "Compare with…", then the file in the picker. */
async function compareWith(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  const chooser = page.waitForEvent('filechooser')
  await compare(page).button.click()
  await (await chooser).setFiles(file)
}

/** run.gpx as A, then run-b.gpx compared with it. */
async function loadPair(page: Page) {
  const opened = await openPage(page)
  await pickFile(page, RUN_GPX)
  await compareWith(page, RUN_B_GPX)
  await expect(compare(page).chips).toHaveText(['ARun fixture×', 'BRun B fixture×'])
  return opened
}

/** A row of the comparison table: [A, B]. */
async function tableRow(page: Page, label: string): Promise<string[]> {
  const row = compare(page)
    .table.getByRole('row')
    .filter({ has: page.getByRole('rowheader', { name: label, exact: true }) })
  return row.getByRole('cell').allTextContents()
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1280, height: 4400 } })

  test('both tracks on the map in their colors; removing B leaves A alone', async ({ page }) => {
    const { unexpected, consoleErrors } = await loadPair(page)
    await expect.poll(async () => (await mapHues(page)).orange).toBeGreaterThan(300)
    expect((await mapHues(page)).blue).toBeGreaterThan(300)
    await expect(compare(page).table).toHaveAccessibleName('Track comparison')

    await page.getByRole('button', { name: 'Remove Run B fixture' }).click()
    await expect(
      trackPage(page).summary.getByRole('heading', { name: 'Run fixture' }),
    ).toBeVisible()
    await expect(compare(page).section).toHaveCount(0)
    await expect.poll(async () => (await mapHues(page)).orange).toBe(0)
    expect((await mapHues(page)).blue).toBeGreaterThan(300)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('charts: a legend in both colors, both values in the tooltip, a hover marker per track', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await loadPair(page)
    const { speed, marker } = trackPage(page)

    // The legend is drawn above the plot, with one icon per track.
    const legend = await hues(speed.locator('canvas').first(), 24)
    expect(legend.blue).toBeGreaterThan(20)
    expect(legend.orange).toBeGreaterThan(20)

    // B (1.27 km) ends before A (1.47 km): the chart's axis covers A.
    expect(await tooltipAt(page, speed, 0.5)).toMatch(
      /^[\d.]+ k?m · A [\d.]+ km\/h · B [\d.]+ km\/h$/,
    )
    await expect(marker).toHaveCount(2)
    expect(await tooltipAt(page, speed, 0.97)).toMatch(/^[\d.]+ km · A [\d.]+ km\/h · B –$/)
    await expect(marker).toHaveCount(1)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('selection: each track highlighted in its color; stats per track; past B’s end', async ({
    page,
  }) => {
    const { unexpected, consoleErrors } = await loadPair(page)
    const { speed, elevation, highlight, reset } = trackPage(page)
    const { table } = compare(page)
    const wholeDistance = await tableRow(page, 'Distance')

    await brush(page, speed, 0.2, 0.6)
    await expect(highlight).toHaveCount(2)
    const strokes = await highlight.evaluateAll((paths) =>
      paths.map((p) => p.getAttribute('stroke')),
    )
    expect(strokes.sort()).toEqual(['#1d4ed8', '#ea580c'])
    await expect(table).toHaveAccessibleName('Selection comparison')
    await expect(page.getByText(/^Selection · /)).toBeVisible()
    const selected = await tableRow(page, 'Distance')
    expect(selected[0]).not.toBe(wholeDistance[0])
    expect(selected[1]).not.toBe(wholeDistance[1])

    // Past B's end: only A has points there.
    await brush(page, elevation, 0.9, 0.98)
    await expect(highlight).toHaveCount(1)
    await expect(table.getByRole('columnheader', { name: 'B · Run B fixture' })).toContainText(
      'Not in selection',
    )
    expect((await tableRow(page, 'Distance'))[1]).toBe('–')

    await page.getByRole('button', { name: 'Show whole track' }).click()
    await expect(table).toHaveAccessibleName('Track comparison')

    // Zoom applies to every chart, and Reset undoes it.
    await wheelZoomIn(page, speed)
    await reset.click()
    await expect(reset).toBeDisabled()

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('time axis with two timed tracks; disabled with an untimed one', async ({ page }) => {
    const { unexpected, consoleErrors } = await loadPair(page)
    const { xAxis, speed } = trackPage(page)
    await xAxis.getByRole('radio', { name: 'Time' }).check()
    expect(await tooltipAt(page, speed, 0.5)).toMatch(/^\d+:\d{2} · A .+ · B .+$/)

    // Replace B with a track without timestamps: distance again, and Time disabled.
    await compareWith(page, NO_ELE_TIME_GPX)
    await expect(compare(page).chips.nth(1)).toContainText('No elevation or time fixture')
    await expect(xAxis.getByRole('radio', { name: 'Time' })).toBeDisabled()
    await expect(xAxis.getByRole('radio', { name: 'Distance' })).toBeChecked()

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('speed colors are off while comparing and come back after removing B', async ({ page }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    await pickFile(page, RUN_GPX)
    const { trackColor } = compare(page)
    await trackColor.getByRole('radio', { name: 'Speed' }).check()
    await expect(page.getByRole('group', { name: 'Speed colors' })).toBeVisible()

    await compareWith(page, RUN_B_GPX)
    await expect(trackColor.getByRole('radio', { name: 'Speed' })).toBeDisabled()
    await expect(trackColor.getByRole('radio', { name: 'Plain' })).toBeChecked()
    await expect(page.getByRole('group', { name: 'Speed colors' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Remove Run B fixture' }).click()
    await expect(trackColor.getByRole('radio', { name: 'Speed' })).toBeChecked()
    await expect(page.getByRole('group', { name: 'Speed colors' })).toBeVisible()

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('loading: two of three files, a bad B keeps A, removing A promotes B', async ({ page }) => {
    const { unexpected, consoleErrors } = await openPage(page)
    const { input, summary } = trackPage(page)

    await input.setInputFiles([RUN_GPX, RUN_B_GPX, NO_ELE_TIME_GPX])
    await expect(compare(page).chips).toHaveCount(2)
    await expect(page.getByRole('status')).toHaveText(
      'Only two files can be compared; loaded run.gpx and run-b.gpx.',
    )

    await page.getByRole('button', { name: 'Remove Run fixture' }).click()
    await expect(summary.getByRole('heading', { name: 'Run B fixture' })).toBeVisible()

    await compareWith(page, {
      name: 'bad.gpx',
      mimeType: 'application/gpx+xml',
      buffer: Buffer.from('<gpx'),
    })
    await expect(page.getByRole('alert')).toContainText("Couldn't open bad.gpx")
    await expect(summary.getByRole('heading', { name: 'Run B fixture' })).toBeVisible()
    await expect(compare(page).section).toHaveCount(0)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true })

  test('chips, Compare button and table fit a 360 px screen', async ({ page }) => {
    const { unexpected, consoleErrors } = await loadPair(page)
    const { section, button } = compare(page)
    await expect(section).toBeVisible()

    for (const target of [button, ...(await section.getByRole('button').all())]) {
      const box = await target.boundingBox()
      expect(box?.width).toBeGreaterThanOrEqual(44)
      expect(box?.height).toBeGreaterThanOrEqual(44)
    }
    // The table scrolls inside its card; the page never scrolls sideways.
    const box = await section.boundingBox()
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(360)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)
    await canvasBox(trackPage(page).speed)
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0)

    expect(unexpected).toEqual([])
    expect(consoleErrors).toEqual([])
  })
})
