import { expect, test } from '@playwright/test'
import path from 'node:path'

const RUN_GPX = path.join(import.meta.dirname, '../src/test/fixtures/run.gpx')

test('loads a GPX file and then rejects a non-GPX file', async ({ page }) => {
  await page.goto('/')
  const input = page.locator('input[type="file"]')

  await input.setInputFiles(RUN_GPX)
  const summary = page.getByRole('region', { name: 'Loaded track' })
  await expect(summary.getByRole('heading', { name: 'run.gpx' })).toBeVisible()
  await expect(summary.getByText('150', { exact: true })).toBeVisible()

  await input.setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('not a gpx file'),
  })
  await expect(page.getByRole('alert')).toHaveText('Please choose a .gpx file.')
  // The previous track stays shown.
  await expect(summary.getByRole('heading', { name: 'run.gpx' })).toBeVisible()
})
