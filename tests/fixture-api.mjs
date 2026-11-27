// Synthetic browser test fixtures. This process is used exclusively by Playwright.
import { createServer } from 'node:http'

const start = Date.parse('2025-07-06T14:00:00Z')
const at = (seconds) => new Date(start + seconds * 1000).toISOString()
const session = { session_key: 42, meeting_key: 41, session_name: 'Race', session_type: 'Race', circuit_short_name: 'Silverstone',
  country_name: 'Great Britain', location: 'Silverstone', year: 2025, date_start: at(0), date_end: at(3600) }
const meeting = { ...session, meeting_name: 'British Grand Prix' }
const drivers = [
  { driver_number: 4, full_name: 'Lando Norris', first_name: 'Lando', last_name: 'Norris', name_acronym: 'NOR', team_name: 'McLaren', team_colour: 'FF8000' },
  { driver_number: 1, full_name: 'Max Verstappen', first_name: 'Max', last_name: 'Verstappen', name_acronym: 'VER', team_name: 'Red Bull Racing', team_colour: '3671C6' },
]
const laps = drivers.map(driver => ({ driver_number: driver.driver_number, date_start: at(0), lap_number: 1, lap_duration: 62,
  i1_speed: 203, duration_sector_1: 23, duration_sector_2: 20, duration_sector_3: 19 }))
const reply = (response, data) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify(data)) }
createServer((request, response) => {
  const url = new URL(request.url, 'http://127.0.0.1')
  if (url.pathname === '/health') return response.end('Healthy')
  if (url.pathname.startsWith('/hubs/')) { response.statusCode = 404; return response.end() }
  const stream = url.pathname.split('/').at(-1)
  const chosen = Number(url.searchParams.get('driver'))
  const from = Math.round((Date.parse(url.searchParams.get('start')) - start) / 1000)
  const until = Math.floor((Date.parse(url.searchParams.get('end')) - start) / 1000)
  const sample = field => Array.from({ length: Math.max(0, until - from) }, (_, i) => ({
    driver_number: chosen || 4, date: at(from + i),
    ...(field === 'location' ? { x: Math.cos(i / 10) * 42, y: Math.sin(i / 10) * 25, z: i % 4 }
      : { speed: 100 + i % 55, rpm: 9500 + i, throttle: 70, brake: 0, n_gear: 4, drs: 0 }),
  }))
  switch (stream) {
    case 'sessions': return reply(response, Number(url.searchParams.get('year')) === 2025 ? [session] : [])
    case 'meetings': return reply(response, Number(url.searchParams.get('year')) === 2025 ? [meeting] : [])
    case 'drivers': return reply(response, drivers)
    case 'laps': return reply(response, chosen ? laps.filter(lap => lap.driver_number === chosen) : laps)
    case 'location':
    case 'car_data': return reply(response, sample(stream))
    case 'starting_grid':
    case 'session_result':
    case 'position': return reply(response, drivers.map((driver, i) => ({ driver_number: driver.driver_number, position: i + 1, date: at(0) })))
    case 'weather': return reply(response, [{ date: at(0), track_temperature: 29, air_temperature: 22, wind_speed: 2.1, humidity: 49 }])
    case 'race_control': return reply(response, [{ date: at(10), flag: 'GREEN', message: 'TEST FIXTURE: GREEN FLAG' }])
    default: return reply(response, [])
  }
}).listen(5050, '127.0.0.1')
