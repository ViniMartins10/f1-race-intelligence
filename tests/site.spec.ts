import { expect, test } from '@playwright/test'
const real = process.env.E2E_REAL === '1'

test('overview loads the driver grid and licensed portraits', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /beyond the finish line/i })).toBeVisible()
  await expect(page.locator('.hero-image img')).toHaveJSProperty('complete', true)
  await expect(page.getByRole('link', { name: /Lando Norris · McLaren/i }).first()).toBeVisible({ timeout: 30_000 })
  const portrait = page.getByRole('img', { name: /Lando Norris/i }).first()
  await expect(portrait).toBeVisible()
  await expect.poll(() => portrait.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Explore drivers' }).click()
  await page.getByRole('searchbox', { name: 'Find driver' }).fill('Norris')
  await expect(page.locator('.driver-card')).toHaveCount(1)
  await page.locator('.driver-card').click()
  await expect(page.getByRole('heading', { name: /Lando Norris/i })).toBeVisible()
})

test('published race results keep driver profiles usable during an OpenF1 outage', async ({ page }) => {
  let restricted = true
  const start = '2025-07-06T14:00:00Z'
  const end = '2025-07-06T16:00:00Z'
  const restriction = { status: 503, json: { title: 'OpenF1 access is restricted.' } }
  await page.route('**/api/feed/sessions?**', route => restricted ? route.fulfill(restriction) : route.fulfill({ json: [{
    session_key: 42, meeting_key: 41, session_name: 'Race', session_type: 'Race', circuit_short_name: 'Silverstone',
    country_name: 'Great Britain', location: 'Silverstone', year: 2025, date_start: start, date_end: end,
  }] }))
  await page.route('**/api/feed/drivers?**', route => restricted ? route.fulfill(restriction) : route.fulfill({ json: [{
    driver_number: 4, full_name: 'Lando Norris', first_name: 'Lando', last_name: 'Norris', name_acronym: 'NOR', team_name: 'McLaren',
  }] }))
  await page.route('**/api/feed/race_grid?**', route => {
    const query = new URL(route.request().url()).searchParams
    expect(query.get('year')).toBe('2025')
    expect(query.get('date')).toBe('2025-07-06')
    return route.fulfill({ json: [{
      raceName: 'British Grand Prix', date: '2025-07-06',
      drivers: [{ number: 4, code: 'NOR', firstName: 'Lando', lastName: 'Norris', team: 'McLaren', nationality: 'British',
        position: 1, status: 'Finished', fastestLap: '1:27.123', laps: 52, points: 25 }],
    }] })
  })

  await page.goto('/')
  await expect(page.getByText('British Grand Prix · Jolpica F1')).toBeVisible()
  const card = page.getByRole('link', { name: 'Lando Norris · McLaren' })
  const portrait = card.getByRole('img', { name: 'Lando Norris' })
  await expect(portrait).toBeVisible()
  await expect.poll(() => portrait.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await page.getByRole('link', { name: 'Explore drivers' }).click()
  await expect(page.getByText('British Grand Prix · Jolpica F1')).toBeVisible()
  await page.locator('.driver-card', { hasText: 'Lando Norris' }).click()
  await expect(page.getByRole('heading', { name: /Lando Norris/i })).toBeVisible()
  await expect(page.getByText('McLaren · British')).toBeVisible()
  await expect(page.getByText('1:27.123')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Explore telemetry' })).toHaveCount(0)

  restricted = false
  await page.getByRole('button', { name: 'Retry OpenF1' }).click()
  await expect(page.getByRole('link', { name: 'Explore telemetry' })).toBeVisible()
  await expect(page.getByText('British Grand Prix · Jolpica F1')).toHaveCount(0)
})

test('race replay supports seek, pause and independent telemetry controls', async ({ page }) => {
  await page.goto('/#/race-control')
  await expect(page.getByText('Historical replay', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Timing tower' })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: 'NOR', exact: true })).toBeVisible({ timeout: 30_000 })
  const position = page.getByRole('slider', { name: 'Replay position' })
  await position.fill(real ? '185' : '15')
  await page.getByLabel('Speed', { exact: true }).selectOption('10')
  await page.getByRole('button', { name: 'Play replay' }).click()
  await expect(page.getByRole('button', { name: 'Pause replay' })).toBeVisible()
  await expect.poll(() => position.inputValue()).not.toBe(real ? '185' : '15')
  await page.getByRole('button', { name: 'Pause replay' }).click()
  await page.getByRole('button', { name: 'Restart replay' }).click()
  await expect(position).toHaveValue('0')
  await position.fill(real ? '185' : '15')
  await page.getByRole('navigation', { name: 'Timing views' }).getByRole('link', { name: 'Telemetry' }).click()
  await expect(page.getByRole('heading', { name: 'Onboard instruments' })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Replay position' })).toHaveValue(real ? '185' : '15')
  await expect(page.locator('.speedometer strong')).toHaveText(real ? /^\d+$/ : '115', { timeout: 24_000 })
  await page.getByRole('link', { name: 'Compare drivers' }).click()
  await expect(page.getByRole('heading', { name: 'Lap overlay' })).toBeVisible()
})

test('mobile navigation and layout fit the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /beyond the finish line/i })).toBeVisible()
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Calendar' }).click()
  await expect(page.getByRole('heading', { name: 'Race calendar.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false')
})
