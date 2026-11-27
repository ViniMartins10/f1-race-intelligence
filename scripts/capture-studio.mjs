import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright'

const baseUrl = process.env.F1_PREVIEW_URL ?? 'http://127.0.0.1:5173'
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, reducedMotion: 'reduce' })
  page.on('pageerror', error => console.error(error))
  await page.goto(baseUrl)
  await page.getByRole('button', { name: 'View 3D car' }).click()
  const studio = page.getByRole('dialog', { name: 'Single-seater studio' })
  await studio.locator('canvas').waitFor({ timeout: 25_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.getByRole('button', { name: 'Three-quarter' }).click()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await mkdir('docs/screenshots', { recursive: true })
  await studio.screenshot({ path: 'docs/screenshots/car-studio.png' })
} finally {
  await browser.close()
}
