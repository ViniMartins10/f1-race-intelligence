import { HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr'

export type Session = {
  session_key: number; meeting_key: number; session_name: string; session_type: string
  circuit_short_name: string; country_name: string; location: string; year: number
  date_start: string; date_end: string
}
export type Meeting = {
  meeting_key: number; meeting_name: string; meeting_official_name?: string; country_name: string
  circuit_short_name: string; location: string; date_start: string; date_end: string; year: number
}
export type Driver = {
  driver_number: number; full_name: string; first_name: string; last_name: string
  name_acronym: string; team_name: string; team_colour?: string
}
export type SeasonDriver = { id: string; code: string; firstName: string; lastName: string; number?: string; nationality?: string }
export type PublishedDriver = {
  number: number; code: string; firstName: string; lastName: string; team: string
  nationality: string | null; position: number | null; status: string | null
  fastestLap: string | null; laps: number | null; points: number | null
}
export type PublishedRaceGrid = { raceName: string; date: string; drivers: PublishedDriver[] }

export function driverFromResult(result: PublishedDriver): Driver {
  return {
    driver_number: result.number, full_name: result.firstName + ' ' + result.lastName,
    first_name: result.firstName, last_name: result.lastName, name_acronym: result.code, team_name: result.team,
  }
}

export type Timing = {
  date?: string; date_start?: string; driver_number?: number; position?: number; lap_number?: number
  gap_to_leader?: number | string | null; interval?: number | string | null; lap_duration?: number | null
  duration_sector_1?: number | null; duration_sector_2?: number | null; duration_sector_3?: number | null
  st_speed?: number | null; i1_speed?: number | null; i2_speed?: number | null; pit_duration?: number
  lane_duration?: number | null; stop_duration?: number | null
  compound?: string; lap_start?: number; lap_end?: number; tyre_age_at_start?: number
  category?: string; flag?: string; message?: string; recording_url?: string; rainfall?: number
  track_temperature?: number; air_temperature?: number; wind_speed?: number; humidity?: number; points?: number
  x?: number; y?: number; z?: number; speed?: number; rpm?: number; n_gear?: number; throttle?: number; brake?: number; drs?: number
  overtaking_driver_number?: number; overtaken_driver_number?: number
}
export type Stream = 'position' | 'starting_grid' | 'session_result' | 'intervals' | 'laps' | 'pit' | 'stints' |
  'weather' | 'race_control' | 'team_radio' | 'location' | 'car_data' | 'overtakes' | 'championship_drivers'
type Query = Record<string, string | number>
type Portrait = { file: string; source: string; license: string; author: string }
let portraits: Record<string, Portrait> = {}
let portraitsPending: Promise<unknown> | undefined
export const getPortrait = (driver?: Driver) => driver ? portraits[driver.full_name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()] : undefined
export function loadPortraits() {
  return portraitsPending ??= fetch('/portraits/credits.json').then(async response => {
    if (response.ok) portraits = await response.json()
  }).catch(() => undefined)
}
const cache = new Map<string, { at: number; rows: unknown[] }>()
const immutableTtl = 30 * 60_000
const activeTtl = 30_000

export async function feed<T>(stream: string, query: Query, signal?: AbortSignal): Promise<T[]> {
  const params = new URLSearchParams(Object.entries(query).map(([name, value]) => [name, String(value)]))
  const key = '/api/feed/' + stream + '?' + params
  const existing = cache.get(key)
  const ttL = stream === 'sessions' || stream === 'meetings' ? activeTtl : immutableTtl
  if (existing && Date.now() - existing.at < ttL) return existing.rows as T[]
  const response = await fetch(key, { signal, headers: { Accept: 'application/json' } })
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.title ?? 'Timing data is currently unavailable.')
  }
  const rows = await response.json()
  cache.set(key, { at: Date.now(), rows })
  while (cache.size > 100) cache.delete(cache.keys().next().value!)
  return rows as T[]
}

const hub = new HubConnectionBuilder().withUrl('/hubs/replay').withAutomaticReconnect().configureLogging(LogLevel.None).build()
let connecting: Promise<void> | undefined
type WindowMessage = { stream: 'car_data' | 'location'; rows: Timing[] }
export async function replayWindow(session: number, driver: number | null, start: string, end: string, signal: AbortSignal,
  onPart?: (part: WindowMessage) => void): Promise<void> {
  if (hub.state === HubConnectionState.Disconnected && !connecting) {
    connecting = hub.start().finally(() => { connecting = undefined })
  }
  if (connecting) await connecting.catch(() => undefined)
  if (signal.aborted) return
  if (hub.state === HubConnectionState.Connected) {
    try {
      await new Promise<void>((resolve, reject) => {
        const subscription = hub.stream<WindowMessage>('StreamWindow', session, driver, start, end).subscribe({
          next: part => onPart?.(part),
          complete: () => { signal.removeEventListener('abort', cancel); resolve() },
          error: error => { signal.removeEventListener('abort', cancel); reject(error) },
        })
        function cancel() { subscription.dispose(); resolve() }
        signal.addEventListener('abort', cancel, { once: true })
      })
      return
    } catch { if (signal.aborted) return }
  }
  const streams = driver === null ? ['location'] as const : ['location', 'car_data'] as const
  const outcomes = await Promise.allSettled(streams.map(async stream => {
    const params = { session, start, end, ...(stream === 'car_data' && driver !== null ? { driver } : {}) }
    onPart?.({ stream, rows: await feed<Timing>(stream, params, signal) })
  }))
  const failed = outcomes.find(outcome => outcome.status === 'rejected')
  if (failed?.status === 'rejected') throw failed.reason
}

export const date = (value?: string) => value ? Date.parse(value) : NaN
export const stamp = (row: Timing) => date(row.date ?? row.date_start)
export const sessionStart = (session?: Session) => date(session?.date_start)
export const elapsed = (seconds: number) => {
  const value = Math.max(0, Math.floor(seconds))
  const hrs = Math.floor(value / 3600)
  const mins = Math.floor(value / 60) % 60
  const sec = value % 60
  return (hrs ? String(hrs).padStart(2, '0') + ':' : '') + [mins, sec].map(x => String(x).padStart(2, '0')).join(':')
}
export const lapTime = (seconds?: number | null) => seconds == null ? '—' :
  Math.floor(seconds / 60) + ':' + (seconds % 60).toFixed(3).padStart(6, '0')
export const utcTime = (time?: string | number) => time === undefined ? '—' : new Date(time).toLocaleTimeString('en-GB', { timeZone: 'UTC' })
export const dateLabel = (time?: string) => time ? new Date(time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—'
export const teamColor = (driver?: Driver) => /^[\da-f]{6}$/i.test(driver?.team_colour ?? '') ? '#' + driver?.team_colour : '#d5f940'
export function lastAt<T extends Timing>(rows: T[], current: number) {
  let low = 0
  let high = rows.length
  while (low < high) {
    const index = (low + high) >>> 1
    if (stamp(rows[index]) <= current) low = index + 1
    else high = index
  }
  return low > 0 ? rows[low - 1] : undefined
}
export function grouped(rows: Timing[]) {
  const result = new Map<number, Timing[]>()
  for (const row of rows) {
    if (row.driver_number === undefined) continue
    const list = result.get(row.driver_number) ?? []
    list.push(row)
    result.set(row.driver_number, list)
  }
  for (const list of result.values()) list.sort((a, b) => stamp(a) - stamp(b))
  return result
}
export function finishedLaps(rows: Timing[], current: number) {
  return rows.filter(row => row.lap_duration != null && stamp(row) + row.lap_duration * 1000 <= current)
}
export function fastest(rows: Timing[]) {
  return rows.reduce<Timing | undefined>((best, row) => row.lap_duration && (!best?.lap_duration || row.lap_duration < best.lap_duration) ? row : best, undefined)
}
export const daysOff = (value: string) => Math.ceil((date(value) - Date.now()) / 86_400_000)
export const validUrl = (url?: string) => url?.startsWith('https://') ? url : undefined
export const mark = (value?: string | number | null) => value ?? '—'
