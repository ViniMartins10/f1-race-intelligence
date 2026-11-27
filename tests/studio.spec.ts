import { expect, test } from '@playwright/test'

test.use({
  launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
})

test('the car studio renders and supports alternate views and reduced motion', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  const open = page.getByRole('button', { name: 'View 3D car' })
  await open.click()
  const dialog = page.getByRole('dialog', { name: 'Single-seater studio' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('canvas')).toBeVisible({ timeout: 45_000 })

  const side = dialog.getByRole('button', { name: 'Side', exact: true })
  const overhead = dialog.getByRole('button', { name: 'Overhead' })
  const spin = dialog.getByRole('button', { name: 'Auto-rotate' })
  await side.click()
  await expect(side).toHaveAttribute('aria-pressed', 'true')
  await spin.click()
  await expect(spin).toHaveAttribute('aria-pressed', 'true')
  await overhead.click()
  await expect(overhead).toHaveAttribute('aria-pressed', 'true')
  await expect(spin).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()
  await open.click()
  await expect(dialog.locator('canvas')).toBeVisible({ timeout: 20_000 })
  await expect(spin).toHaveCount(0)
  await overhead.click()
  await expect(overhead).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
})

test('the studio shows its fallback when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type.startsWith('webgl') ? null : Reflect.apply(original, this, [type, ...args])
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'View 3D car' }).click()
  await expect(page.getByText('Interactive 3D is unavailable on this device.')).toBeVisible()
})
