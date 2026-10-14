import { expect, test } from '@playwright/test'
import { hover, NO_ELE_TIME_GPX, RUN_GPX, stubExternalRequests } from './helpers.ts'

test('speed/pace chart and the x-axis toggle', async ({ page }) => {
  const unexpected = await stubExternalRequests(page)
  await page.goto('/')
  const input = page.locator('input[type="file"]')
  const elevation = page.getByRole('region', { name: 'Elevation chart' })
  const speed = page.getByRole('region', { name: 'Speed chart' })
  const xAxis = page.getByRole('group', { name: 'X axis' })

  await input.setInputFiles(RUN_GPX)
  await expect(elevation.locator('canvas')).toHaveCount(1)
  await expect(speed.locator('canvas')).toHaveCount(1)
  await expect(xAxis.getByRole('radio', { name: 'Distance' })).toBeChecked()

  // Speed, then Pace.
  await hover(page, speed)
  await expect(speed.getByText(/ · \d+\.\d km\/h$/)).toBeVisible()
  await speed.getByRole('radio', { name: 'Pace' }).check()
  await expect(speed.getByRole('heading', { name: 'Pace' })).toBeVisible()
  await hover(page, speed, 0.3)
  await expect(speed.getByText(/ · (\d+:\d{2} \/km|–)$/)).toBeVisible()

  // Elapsed time on both charts.
  await xAxis.getByRole('radio', { name: 'Time' }).check()
  await hover(page, elevation, 0.4)
  await expect(elevation.getByText(/^\d+:\d{2} · \d+ m$/)).toBeVisible()
  await hover(page, speed, 0.4)
  await expect(speed.getByText(/^\d+:\d{2} · /)).toBeVisible()

  // Tap-sized toggle options.
  for (const option of await page.locator('fieldset label').all()) {
    const box = await option.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }

  // No timestamps: Time disabled, both empty states.
  await input.setInputFiles(NO_ELE_TIME_GPX)
  await expect(xAxis.getByRole('radio', { name: 'Time' })).toBeDisabled()
  await expect(xAxis.getByRole('radio', { name: 'Distance' })).toBeChecked()
  await expect(elevation.getByText('This track has no elevation data.')).toBeVisible()
  await expect(
    speed.getByText("This track has no timestamps, so speed and pace can't be shown."),
  ).toBeVisible()

  expect(unexpected).toEqual([])
})

test('the x-axis toggle works with the keyboard', async ({ page }) => {
  await stubExternalRequests(page)
  await page.goto('/')
  await page.locator('input[type="file"]').setInputFiles(RUN_GPX)
  const xAxis = page.getByRole('group', { name: 'X axis' })
  const distance = xAxis.getByRole('radio', { name: 'Distance' })
  const time = xAxis.getByRole('radio', { name: 'Time' })
  await expect(distance).toBeChecked()

  // Tabbing from the map's "Fit to track" button reaches the group's checked radio.
  await page.getByRole('button', { name: 'Fit to track' }).focus()
  const distanceFocused = distance.and(page.locator(':focus'))
  for (let i = 0; i < 10 && (await distanceFocused.count()) === 0; i++) {
    await page.keyboard.press('Tab')
  }
  await expect(distance).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(time).toBeChecked()
  await expect(time).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(distance).toBeChecked()
})
