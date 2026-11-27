import { defineConfig } from '@playwright/test'
const real = process.env.E2E_REAL === '1'
const alreadyRunning = process.env.E2E_RUNNING === '1'
export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5173', screenshot: 'only-on-failure' },
  reporter: [['list'], ['html', { open: 'never' }]],
  webServer: alreadyRunning ? undefined : [
    { command: real ? 'dotnet run --project server/API/F1RaceIntelligence.API.csproj --urls http://127.0.0.1:5050' : 'node tests/fixture-api.mjs',
      url: 'http://127.0.0.1:5050/health', reuseExistingServer: false, timeout: 90_000 },
    { command: 'npm run dev -- --strictPort', url: 'http://127.0.0.1:5173', reuseExistingServer: false, timeout: 60_000 },
  ],
})
