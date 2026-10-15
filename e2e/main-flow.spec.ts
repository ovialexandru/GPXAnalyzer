import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  BIKE_GPX,
  brush,
  canvasBox,
  hover,
  KM_TOLERANCE,
  meters,
  openPage,
  pickFile,
  RUN_GPX,
  seconds,
  summaryStat,
  TOOLTIP,
  tooltipAt,
  trackPage,
  wheelZoomIn,
  xAt,
} from './helpers.ts'

// Tall enough for the whole page, so no step scrolls under the mouse.
test.use({ viewport: { width: 1280, height: 4400 } })

type Stats = Record<string, string>

/** Whole-track reference values, metric (Phases 9, 13, 14), in display order. */
const RUN_STATS: Stats = {
  Distance: '1.47 km',
  Duration: '10:44',
  'Elevation gain': '6 m',
  'Avg speed': '8.2 km/h',
  'Max speed': '13.6 km/h',
  'Avg HR': '144 bpm',
  'Max HR': '159 bpm',
  'Avg cadence': '69 rpm',
  'Max cadence': '79 rpm',
}
const BIKE_STATS: Stats = {
  Distance: '2.52 km',
  Duration: '11:57',
  'Elevation gain': '22 m',
  'Avg speed': '17.5 km/h',
  'Max speed': '33.7 km/h',
  'Avg HR': '156 bpm',
  'Max HR': '166 bpm',
}

/** Left and right padding around the charts' plot area, in px (`PLOT_INSET` in chartTheme.ts). */
const PLOT_INSET = { left: 64, right: 24 }

/** The summary's stats as label → text. */
async function shownStats(page: Page): Promise<Stats> {
  const { stats } = trackPage(page)
  const labels = await stats.locator('dt').allTextContents()
  const values = await stats.locator('dd').allTextContents()
  return Object.fromEntries(labels.map((label, i) => [label, values[i]]))
}

/** Exactly the reference stats, in order, labelled as the whole track's. */
async function wholeTrackStats(page: Page, expected: Stats) {
  const { stats, selectionLine } = trackPage(page)
  await expect(stats).toHaveAttribute('aria-label', 'Whole-track stats')
  await expect(selectionLine).toHaveCount(0)
  await expect(stats.locator('dt')).toHaveText(Object.keys(expected))
  await expect(stats.locator('dd')).toHaveText(Object.values(expected))
}

/** The selection line's range in meters: "Selection · 440 m – 880 m" → [440, 880]. */
async function selectionRange(page: Page): Promise<[number, number]> {
  const text = (await trackPage(page).selectionLine.textContent()) ?? ''
  const [start, end] = text
    .replace(/^Selection · /, '')
    .split(' – ')
    .map(meters)
  return [start, end]
}

/** Rules that hold for any selection, wherever the drag happened to land. */
async function selectionInvariants(page: Page, whole: Stats) {
  const { stats } = trackPage(page)
  await expect(stats).toHaveAttribute('aria-label', 'Selection stats')
  // Nothing missing: the same stats as for the whole track.
  await expect(stats.locator('dt')).toHaveText(Object.keys(whole))
  const shown = await shownStats(page)

  // Span: both ends and the distance are rounded for display.
  const [start, end] = await selectionRange(page)
  expect(Math.abs(meters(shown.Distance) - (end - start))).toBeLessThanOrEqual(10)

  // Part of the whole.
  expect(meters(shown.Distance)).toBeLessThanOrEqual(meters(whole.Distance))
  expect(seconds(shown.Duration)).toBeLessThanOrEqual(seconds(whole.Duration))
  expect(meters(shown['Elevation gain'])).toBeLessThanOrEqual(meters(whole['Elevation gain']))
  for (const max of ['Max speed', 'Max HR', 'Max cadence']) {
    expect(parseFloat(shown[max]), max).toBeLessThanOrEqual(parseFloat(whole[max]))
  }
  const avgHr = parseFloat(shown['Avg HR'])
  expect(avgHr).toBeGreaterThanOrEqual(90)
  expect(avgHr).toBeLessThanOrEqual(200)
  const avgCadence = parseFloat(shown['Avg cadence'])
  expect(avgCadence).toBeGreaterThanOrEqual(40)
  expect(avgCadence).toBeLessThanOrEqual(100)
}

/** The x range (km) of a chart's visible window: the tooltip x just inside each plot edge. */
async function chartWindow(page: Page, chart: Locator): Promise<[number, number]> {
  const { width } = await canvasBox(chart)
  const left = await xAt(page, chart, (PLOT_INSET.left + 2) / width)
  const right = await xAt(page, chart, (width - PLOT_INSET.right - 2) / width)
  return [left, right]
}

async function chartNames(page: Page): Promise<string[]> {
  const names = await page
    .getByRole('region', { name: / chart$/ })
    .evaluateAll((regions) => regions.map((r) => r.getAttribute('aria-label')))
  return names.filter((n): n is string => n !== null)
}

test('main flow: upload, hover, zoom, select, stats, units, clear, second file', async ({
  page,
}) => {
  const t = trackPage(page)
  const charts = [t.speed, t.elevation, t.heartRate, t.cadence]

  const { unexpected, consoleErrors } = await test.step('Open', async () => {
    const opened = await openPage(page)
    const intro = page.getByRole('region', { name: 'Getting started' })
    await expect(intro).toBeVisible()
    await expect(intro.getByRole('button', { name: 'Try a sample track' })).toBeVisible()
    await expect(page.getByText('Drop a GPX file here or')).toBeVisible()
    await expect(t.units.getByRole('radio', { name: 'Metric' })).toBeChecked()
    await expect(t.summary).toHaveCount(0)
    return opened
  })

  await test.step('Upload', async () => {
    await pickFile(page, RUN_GPX)
    await expect(t.summary.getByRole('heading', { name: 'Run fixture' })).toBeVisible()
    await wholeTrackStats(page, RUN_STATS)
    await expect(t.map.locator('canvas')).toBeAttached()
    for (const chart of charts) await expect(chart.locator('canvas')).toHaveCount(1)
    expect(await chartNames(page)).toEqual([
      'Speed chart',
      'Elevation chart',
      'Heart rate chart',
      'Cadence chart',
    ])
    await expect(page.getByText('Drop another GPX file here or')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Getting started' })).toHaveCount(0)
  })

  await test.step('Hover', async () => {
    await expect(t.marker).toHaveCount(0)
    expect(await tooltipAt(page, t.elevation, 0.25)).toMatch(/^[\d.]+ k?m · \d+ m$/)
    await expect(t.marker).toBeVisible()
    const first = await t.marker.boundingBox()
    await hover(page, t.elevation, 0.75)
    await expect.poll(async () => (await t.marker.boundingBox())?.x).not.toBe(first?.x)

    await page.mouse.move(5, 5)
    await expect(t.marker).toHaveCount(0)
    await expect(t.elevation.getByText(TOOLTIP)).toBeHidden()
  })

  await test.step('Zoom', async () => {
    await expect(t.reset).toBeDisabled()
    const full = await xAt(page, t.speed, 0.9)
    await wheelZoomIn(page, t.speed)
    await expect.poll(() => xAt(page, t.speed, 0.9)).toBeLessThan(full - 0.05)
    for (const fraction of [0.1, 0.9]) {
      const expected = await xAt(page, t.speed, fraction)
      for (const chart of charts.slice(1)) {
        expect(Math.abs((await xAt(page, chart, fraction)) - expected)).toBeLessThanOrEqual(
          KM_TOLERANCE,
        )
      }
    }
  })

  await test.step('Select', async () => {
    await expect(t.highlight).toHaveCount(0)
    await brush(page, t.elevation, 0.3, 0.6)
    await expect(t.highlight).toHaveCount(1)
    await expect(t.selectionLine).toHaveText(/^Selection · [\d.]+ k?m – [\d.]+ k?m$/)
    await selectionInvariants(page, RUN_STATS)
  })

  await test.step('Zoom to selection', async () => {
    const [start, end] = (await selectionRange(page)).map((m) => m / 1000)
    const line = await t.selectionLine.textContent()
    await t.zoomToSelection.click()
    await expect(t.reset).toBeEnabled()
    for (const chart of charts) {
      await expect
        .poll(async () => {
          const [left, right] = await chartWindow(page, chart)
          return Math.max(Math.abs(left - start), Math.abs(right - end))
        })
        .toBeLessThanOrEqual(KM_TOLERANCE)
    }

    await t.reset.click()
    await expect(t.reset).toBeDisabled()
    await expect(t.highlight).toHaveCount(1)
    await expect(t.selectionLine).toHaveText(line ?? '')
  })

  await test.step('Units', async () => {
    const line = (await t.selectionLine.textContent()) ?? ''
    const metric = await shownStats(page)
    const path = await t.highlight.getAttribute('d')

    await t.units.getByRole('radio', { name: 'Imperial' }).check()
    await expect(t.selectionLine).toHaveText(/^Selection · [\d.]+ (ft|mi) – [\d.]+ (ft|mi)$/)
    await expect(summaryStat(page, 'Distance')).toHaveText(/^[\d.]+ (ft|mi)$/)
    await expect(summaryStat(page, 'Elevation gain')).toHaveText(/^\d+ ft$/)
    await expect(summaryStat(page, 'Avg speed')).toHaveText(/^[\d.]+ mph$/)
    await expect(summaryStat(page, 'Max speed')).toHaveText(/^[\d.]+ mph$/)
    await expect(t.stats).toHaveAttribute('aria-label', 'Selection stats')
    await expect(t.highlight).toHaveCount(1)
    expect(await t.highlight.getAttribute('d')).toBe(path)

    await t.units.getByRole('radio', { name: 'Metric' }).check()
    await expect(t.selectionLine).toHaveText(line)
    await expect(t.stats.locator('dd')).toHaveText(Object.values(metric))
    expect(await t.highlight.getAttribute('d')).toBe(path)
  })

  await test.step('Clear', async () => {
    await page.keyboard.press('Escape')
    await expect(t.highlight).toHaveCount(0)
    await wholeTrackStats(page, RUN_STATS)
  })

  await test.step('Second file', async () => {
    await pickFile(page, BIKE_GPX)
    await expect(t.summary.getByRole('heading', { name: 'Bike fixture' })).toBeVisible()
    await wholeTrackStats(page, BIKE_STATS)
    await expect(t.reset).toBeDisabled()
    await expect(t.zoomToSelection).toBeDisabled()
    await expect(t.clear).toBeDisabled()
    await expect(t.highlight).toHaveCount(0)
    await expect(t.cadence).toHaveCount(0)
    expect(await chartNames(page)).toEqual(['Speed chart', 'Elevation chart', 'Heart rate chart'])
  })

  expect(unexpected).toEqual([])
  expect(consoleErrors).toEqual([])
})
