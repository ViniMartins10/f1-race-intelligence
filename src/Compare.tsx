import { useMemo, useState } from 'react'
import { Activity, Braces, Timer } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fastest, lapTime, mark, stamp, teamColor, type Driver, type Session, type Timing } from './data'
import { useFeed } from './hooks'
import { Empty, Loading, Select } from './UI'

type Metric = 'speed' | 'rpm' | 'n_gear' | 'throttle' | 'brake'
const metrics: { field: Metric; label: string; units: string }[] = [
  { field: 'speed', label: 'Speed', units: 'km/h' }, { field: 'rpm', label: 'RPM', units: 'rpm' },
  { field: 'n_gear', label: 'Gear', units: 'gear' }, { field: 'throttle', label: 'Throttle', units: '%' },
  { field: 'brake', label: 'Brake', units: '%' },
]
function lapQuery(session: number, driver: number, lap?: Timing) {
  return lap?.date_start && lap.lap_duration ? {
    session, driver, start: lap.date_start, end: new Date(stamp(lap) + lap.lap_duration * 1000).toISOString(),
  } : undefined
}
function distanceProfile(rows: Timing[]) {
  let distance = 0
  return [...rows].sort((a, b) => stamp(a) - stamp(b)).flatMap((row, i, list) => {
    const previous = list[i - 1]
    if (previous?.speed != null && row.speed != null) distance += Math.max(0, Math.min(3, (stamp(row) - stamp(previous)) / 1000)) * (row.speed + previous.speed) / 7.2
    return row.speed != null ? [{ row, distance }] : []
  })
}
function valueAt(profile: ReturnType<typeof distanceProfile>, index: number, distance: number, field: Metric) {
  const start = profile[index - 1]
  const end = profile[index]
  if (!end || !start) return null
  const left = start.row[field]
  const right = end.row[field]
  if (left == null || right == null) return null
  return field === 'brake' || field === 'n_gear' ? left :
    Number((left + (right - left) * ((distance - start.distance) / Math.max(.001, end.distance - start.distance))).toFixed(1))
}
export default function Compare({ session, drivers, laps, loading }: { session: Session; drivers: Driver[]; laps: Timing[]; loading: boolean }) {
  const [driverA, setDriverA] = useState(0)
  const [driverB, setDriverB] = useState(0)
  const [lapA, setLapA] = useState(0)
  const [lapB, setLapB] = useState(0)
  const [metric, setMetric] = useState(metrics[0])
  const [first, second] = [
    drivers.find(driver => driver.driver_number === driverA) ?? drivers.find(driver => driver.name_acronym === 'NOR') ?? drivers[0],
    drivers.find(driver => driver.driver_number === driverB) ?? drivers.find(driver => driver.name_acronym === 'VER') ?? drivers[1],
  ]
  const lapsFor = (driver?: Driver) => laps.filter(lap => lap.driver_number === driver?.driver_number && !!lap.lap_duration && !!lap.date_start)
  const firstLaps = lapsFor(first)
  const secondLaps = lapsFor(second)
  const selectedA = firstLaps.find(row => row.lap_number === lapA) ?? fastest(firstLaps)
  const selectedB = secondLaps.find(row => row.lap_number === lapB) ?? fastest(secondLaps)
  const rawA = useFeed<Timing>('car_data', first ? lapQuery(session.session_key, first.driver_number, selectedA) : undefined)
  const rawB = useFeed<Timing>('car_data', second ? lapQuery(session.session_key, second.driver_number, selectedB) : undefined)
  const profileA = useMemo(() => distanceProfile(rawA.rows ?? []), [rawA.rows])
  const profileB = useMemo(() => distanceProfile(rawB.rows ?? []), [rawB.rows])
  const distance = Math.max(profileA.at(-1)?.distance ?? 0, profileB.at(-1)?.distance ?? 0)
  const step = Math.max(20, Math.ceil(distance / 250))
  const series = Array.from({ length: Math.floor(distance / step) }, (_, i) => {
    const d = (i + 1) * step
    return { distance: d, first: valueAt(profileA, profileA.findIndex(row => row.distance >= d), d, metric.field),
      second: valueAt(profileB, profileB.findIndex(row => row.distance >= d), d, metric.field) }
  })
  const choices = drivers.map(driver => ({ value: driver.driver_number, label: driver.full_name }))
  const lapChoices = (rows: Timing[]) => [{ value: 0, label: 'Fastest lap' }, ...rows.filter(row => row.lap_number != null).map(row =>
    ({ value: row.lap_number!, label: 'Lap ' + row.lap_number + ' · ' + lapTime(row.lap_duration) }))]
  const maxSpeed = (rows: Timing[]) => Math.max(0, ...rows.map(row => row.speed ?? 0)) || null
  const brakePoints = (profile: ReturnType<typeof distanceProfile>) => profile.filter(({ row }, index) => row.brake && !profile[index - 1]?.row.brake)
  return <>
    <div className="compare-controls">
      <Select title="Driver A" value={first?.driver_number ?? ''} onChange={value => { setDriverA(value); setLapA(0) }} choices={choices}/>
      <Select title="Lap A" value={lapA} onChange={setLapA} choices={lapChoices(firstLaps)}/>
      <Select title="Driver B" value={second?.driver_number ?? ''} onChange={value => { setDriverB(value); setLapB(0) }} choices={choices}/>
      <Select title="Lap B" value={lapB} onChange={setLapB} choices={lapChoices(secondLaps)}/>
    </div>
    {loading && !laps.length && <Loading>Acquiring lap times</Loading>}
    <section className="panel chart-panel">
      <div className="panel-heading"><div><Activity size={17}/><h2>Lap overlay</h2></div><span className="tag">ESTIMATED DISTANCE</span></div>
      <div className="chart-toggles">{metrics.map(option => <button className="button button-light" aria-pressed={option.field === metric.field} key={option.field} onClick={() => setMetric(option)}>{option.label}</button>)}</div>
      {(rawA.error || rawB.error) && <Empty error action={<button className="button button-light" onClick={() => { rawA.retry(); rawB.retry() }}>Retry traces</button>}>{rawA.error ?? rawB.error}</Empty>}
      {series.length > 1 ? <ResponsiveContainer width="100%" height={330}><LineChart data={series} margin={{ top: 10, right: 24, bottom: 12, left: 5 }}>
        <CartesianGrid stroke="#343930" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="distance" unit="m" minTickGap={28} stroke="#aab1a1"/><YAxis stroke="#aab1a1"/>
        <Tooltip contentStyle={{ background: '#141813', border: '1px solid #343930' }} labelFormatter={value => value + ' m estimated'} formatter={value => value + ' ' + metric.units} />
        <Line type="linear" dataKey="first" name={first?.name_acronym ?? 'A'} stroke={teamColor(first)} strokeWidth={2.5} dot={false} isAnimationActive={false}/>
        <Line type="linear" dataKey="second" name={second?.name_acronym ?? 'B'} stroke={teamColor(second) === teamColor(first) ? '#e8eee3' : teamColor(second)} strokeDasharray="6 4" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
      </LineChart></ResponsiveContainer> : rawA.loading || rawB.loading ? <Loading>Acquiring lap traces</Loading> : <Empty>Recorded telemetry is unavailable for this pair of laps.</Empty>}
      <p className="instrument-note">Distance is estimated independently for each lap from its speed samples. Gaps in the source can affect alignment.</p>
    </section>
    <div className="race-layout comparison-summary">{[
      { driver: first, lap: selectedA, rows: rawA.rows ?? [], trace: profileA },
      { driver: second, lap: selectedB, rows: rawB.rows ?? [], trace: profileB },
    ].map(({ driver, lap, rows, trace }, i) => <section className="panel" key={i}>
      <div className="panel-heading"><div><Timer size={17} style={{ color: teamColor(driver) }}/><h2>{driver?.full_name ?? 'Driver'}</h2></div><span className="tag">LAP {mark(lap?.lap_number)}</span></div>
      <div className="sector-grid">{[{ label: 'LAP', value: lapTime(lap?.lap_duration) }, { label: 'S1', value: mark(lap?.duration_sector_1) }, { label: 'S2', value: mark(lap?.duration_sector_2) }, { label: 'S3', value: mark(lap?.duration_sector_3) }, { label: 'MAX KM/H', value: mark(maxSpeed(rows)) }].map(({ label, value }) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>
      <div className="instrument-note"><Braces size={14}/> Braking onsets {brakePoints(trace).length ? brakePoints(trace).slice(0, 15).map(point => Math.round(point.distance) + ' m').join(' · ') : '—'}</div>
    </section>)}</div>
  </>
}
