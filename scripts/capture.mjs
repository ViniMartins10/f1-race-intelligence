import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const path = 'docs/screenshots'
await mkdir(path, { recursive: true })
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' })
  page.on('pageerror', error => console.error(error))
  await page.goto('http://127.0.0.1:5173/')
  await page.locator('.driver-card img').first().waitFor({ timeout: 30_000 }).catch(() => undefined)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path + '/overview-desktop.png', fullPage: true })
  await page.goto('http://127.0.0.1:5173/#/race-control')
  await page.getByRole('heading', { name: 'Timing tower' }).waitFor({ timeout: 30_000 })
  await page.getByRole('slider', { name: 'Replay position' }).fill('524')
  await page.locator('.track-viewport svg[aria-label]').waitFor({ timeout: 28_000 }).catch(() => undefined)
  await page.locator('.track-marker').first().waitFor({ timeout: 18_000 }).catch(() => undefined)
  await page.locator('.replay-range input').blur()
  await page.screenshot({ path: path + '/race-control.png', fullPage: true })
  await page.goto('http://127.0.0.1:5173/#/telemetry')
  await page.getByRole('heading', { name: 'Onboard instruments' }).waitFor({ timeout: 30_000 })
  await page.getByRole('slider', { name: 'Replay position' }).fill('524')
  await page.waitForFunction(() => /^\d+$/.test(document.querySelector('.speedometer strong')?.textContent ?? ''), undefined, { timeout: 20_000 }).catch(() => undefined)
  await page.locator('.replay-range input').blur()
  await page.screenshot({ path: path + '/telemetry.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('http://127.0.0.1:5173/')
  await page.locator('.driver-card img').first().waitFor({ timeout: 30_000 }).catch(() => undefined)
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: path + '/overview-mobile.png', fullPage: true })
} finally {
  await browser.close()
}
