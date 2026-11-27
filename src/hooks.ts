import { useCallback, useEffect, useMemo, useState } from 'react'
import { date, feed, grouped, replayWindow, stamp, type Session, type Stream, type Timing } from './data'

export function useFeed<T>(stream: string, query?: Record<string, string | number>) {
  const queryKey = query ? JSON.stringify(query) : ''
  const [state, setState] = useState<{ key: string; rows?: T[]; error?: string }>({ key: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!queryKey) return
    const controller = new AbortController()
    feed<T>(stream, JSON.parse(queryKey), controller.signal)
      .then(rows => { if (!controller.signal.aborted) setState({ key: queryKey, rows }) })
      .catch(error => { if (!controller.signal.aborted) setState({ key: queryKey, error: error.message }) })
    return () => controller.abort()
  }, [stream, queryKey, attempt])
  const retry = useCallback(() => { setState({ key: '' }); setAttempt(old => old + 1) }, [])
  return { rows: state.key === queryKey ? state.rows : undefined, error: state.key === queryKey ? state.error : undefined,
    loading: Boolean(queryKey && (state.key !== queryKey || (!state.rows && !state.error))), retry }
}
const timingStreams = ['position', 'intervals', 'laps', 'pit', 'stints', 'weather',
  'race_control', 'team_radio', 'starting_grid', 'session_result', 'overtakes'] as const satisfies readonly Stream[]
type BaseStream = typeof timingStreams[number]
type TimingState = Partial<Record<BaseStream, Timing[]>>
export function useTiming(session: number) {
  const [state, setState] = useState<{ session: number; data: TimingState; success: number; errors: string[] }>({ session: 0, data: {}, success: 0, errors: [] })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!session) return
    const controller = new AbortController()
    for (const stream of timingStreams) {
      void feed<Timing>(stream, { session }, controller.signal).then(rows => {
        if (controller.signal.aborted) return
        setState(state => {
          const previous = state.session === session ? state : { session, data: {}, success: 0, errors: [] }
          return { ...previous, success: previous.success + 1, data: { ...previous.data, [stream]: rows.sort((a, b) => stamp(a) - stamp(b)) } }
        })
      }).catch(error => {
        if (controller.signal.aborted) return
        setState(state => {
          const previous = state.session === session ? state : { session, data: {}, success: 0, errors: [] }
          return { ...previous, errors: [...previous.errors, error.message] }
        })
      })
    }
    return () => controller.abort()
  }, [session, attempt])
  const valid = state.session === session
  return { data: valid ? state.data : {}, loading: session > 0 && (!valid || state.success + state.errors.length < timingStreams.length),
    errors: valid ? [...new Set(state.errors)] : [], retry: () => {
      setState({ session: 0, data: {}, success: 0, errors: [] })
      setAttempt(old => old + 1)
    } }
}
const windowMs = 60_000
type WindowState = { location?: Timing[]; car_data?: Timing[]; error?: string }
export function useReplayWindow(session: Session, driver: number, time: number, playing: boolean, enabled: boolean) {
  const origin = date(session.date_start)
  const base = Math.max(0, Math.floor((time - origin) / windowMs))
  const key = session.session_key + '/' + driver
  const [state, setState] = useState<{ key: string; windows: Record<number, WindowState> }>({ key: '', windows: {} })
  const [attempt, setAttempt] = useState(0)

  const windows = state.key === key ? state.windows : {}
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    const start = new Date(origin + Math.max(0, base * windowMs - 2000)).toISOString()
    const end = new Date(origin + (base + 1) * windowMs + 2000).toISOString()
    const apply = (patch: WindowState) => {
      if (controller.signal.aborted) return
      setState(state => {
        const entries = Object.entries(state.key === key ? state.windows : {}).filter(([index]) => Math.abs(Number(index) - base) < 4)
        const windows: Record<number, WindowState> = Object.fromEntries(entries)
        return { key, windows: { ...windows, [base]: { ...windows[base], ...patch } } }
      })
    }
    void replayWindow(session.session_key, driver || null, start, end, controller.signal, part => apply({ [part.stream]: part.rows }))
      .catch(error => apply({ error: error.message }))
    return () => controller.abort()
  }, [attempt, base, driver, enabled, key, origin, session.session_key])

  useEffect(() => {
    if (!enabled || !playing || (time - origin) % windowMs < windowMs - 12_000) return
    const start = new Date(origin + (base + 1) * windowMs - 2000).toISOString()
    const end = new Date(origin + (base + 2) * windowMs + 2000).toISOString()
    const controller = new AbortController()
    // Warm the shared API cache while the active clock is still in the previous interval.
    void replayWindow(session.session_key, driver || null, start, end, controller.signal).catch(() => undefined)
    return () => controller.abort()
  }, [base, driver, enabled, origin, playing, session.session_key, (time - origin) % windowMs >= windowMs - 12_000])

  const window = windows[base] ?? windows[base - 1]
  const locations = useMemo(() => grouped(window?.location ?? []), [window?.location])
  const telemetry = useMemo(() => (window?.car_data ?? []).sort((a, b) => stamp(a) - stamp(b)), [window?.car_data])
  return { locations, telemetry, error: window?.error, retry: () => setAttempt(old => old + 1) }
}
