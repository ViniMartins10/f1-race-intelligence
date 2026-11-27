import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Activity, CloudRain, Flag, Gauge, Maximize2, Pause, Play, Radio, RotateCcw, Thermometer, Timer, Wind } from 'lucide-react'
import { date, elapsed, fastest, finishedLaps, grouped, lapTime, lastAt, mark, stamp, teamColor, utcTime, validUrl, type Driver, type Session, type Timing } from './data'
import { useFeed, useReplayWindow, useTiming } from './hooks'
import { Empty, Loading, Portrait, Select } from './UI'
import { Track } from './Track'

const Telemetry = lazy(() => import('./Telemetry'))
const Compare = lazy(() => import('./Compare'))
const speeds = [.5, 1, 2, 5, 10]
const emptyRows: Timing[] = []
const gap = (value?: string | number | null) => typeof value === 'number' ? value.toFixed(3) : value ?? '—'
export default function Cockpit({ mode, session, drivers, initialDriver }: { mode: string; session: Session; drivers: Driver[]; initialDriver: number }) {
  const start = date(session.date_start)
  const end = Math.max(start + 1000, date(session.date_end))
  const [time, setTime] = useState(start)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selection, select] = useState(initialDriver)
  const driver = drivers.find(driver => driver.driver_number === selection) ??
    drivers.find(driver => driver.name_acronym === 'NOR') ?? drivers[0]
  const selected = driver?.driver_number ?? 0
  const section = useRef<HTMLDivElement>(null)
  const cursor = useRef(start)
  const timing = useTiming(session.session_key)
  const laps = timing.data.laps ?? emptyRows
  const locationNeeded = mode === 'race-control'
  const window = useReplayWindow(session, selected, time, playing, locationNeeded || mode === 'telemetry')
  const lapIndex = useMemo(() => grouped(laps), [laps])
  const positionIndex = useMemo(() => grouped(timing.data.position ?? emptyRows), [timing.data.position])
  const intervalIndex = useMemo(() => grouped(timing.data.intervals ?? emptyRows), [timing.data.intervals])
  const stintIndex = useMemo(() => grouped(timing.data.stints ?? emptyRows), [timing.data.stints])
  const trackLap = useMemo(() => fastest(laps.filter(lap => !!lap.date_start)), [laps])
  const trackQuery = locationNeeded && trackLap?.lap_duration && trackLap.date_start && trackLap.driver_number ? {
    session: session.session_key, driver: trackLap.driver_number, start: trackLap.date_start,
    end: new Date(stamp(trackLap) + trackLap.lap_duration * 1000).toISOString(),
  } : undefined
  const track = useFeed<Timing>('location', trackQuery)

  useEffect(() => {
    if (!playing) return
    let animation = 0
    let lastFrame = performance.now()
    let lastPaint = lastFrame
    const advance = (t: number) => {
      cursor.current = Math.min(end, cursor.current + Math.min(180, t - lastFrame) * speed)
      lastFrame = t
      if (t - lastPaint > 80 || cursor.current >= end) {
        setTime(cursor.current)
        lastPaint = t
      }
      if (cursor.current >= end) setPlaying(false)
      else animation = requestAnimationFrame(advance)
    }
    animation = requestAnimationFrame(advance)
    return () => cancelAnimationFrame(animation)
  }, [end, playing, speed])
  function seek(value: number) {
    cursor.current = Math.min(end, Math.max(start, value))
    setTime(cursor.current)
  }
  const currentWeather = lastAt(timing.data.weather ?? [], time)
  const currentEvents = (timing.data.race_control ?? []).filter(row => stamp(row) <= time).slice(-35).reverse()
  const overtakes = (timing.data.overtakes ?? []).filter(row => stamp(row) <= time).slice(-12).reverse()
  const driversByNumber = new Map(drivers.map(driver => [driver.driver_number, driver]))
  const previousPositions = new Map(drivers.map(driver => [driver.driver_number, lastAt(positionIndex.get(driver.driver_number) ?? [], time - 3000)?.position]))
  const tower = drivers.map(driver => {
    const number = driver.driver_number
    const completed = finishedLaps(lapIndex.get(number) ?? [], time)
    const last = completed.at(-1)
    const reported = lastAt(positionIndex.get(number) ?? [], time)
    const grid = timing.data.starting_grid?.find(row => row.driver_number === number)
    const stint = (stintIndex.get(number) ?? []).find(row => (row.lap_start ?? Infinity) <= (last?.lap_number ?? 0) && (row.lap_end ?? Infinity) >= (last?.lap_number ?? 0))
    return { driver, last, best: fastest(completed), position: (time >= end ? timing.data.session_result?.find(row => row.driver_number === number)?.position : undefined) ?? reported?.position ?? grid?.position,
      interval: lastAt(intervalIndex.get(number) ?? [], time), stint, stopCount: timing.data.pit?.filter(row => row.driver_number === number && stamp(row) <= time).length }
  }).sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity) || a.driver.driver_number - b.driver.driver_number)
  const leaderLap = Math.max(0, ...tower.map(item => item.last?.lap_number ?? 0))
  const maxLap = Math.max(0, ...laps.map(lap => lap.lap_number ?? 0))

  return <div className="cockpit" ref={section}>
    <section className="replay-bar" aria-label="Historical replay timeline">
      <div className="replay-identity"><Radio size={19}/><div><strong>{session.circuit_short_name} · {session.session_name}</strong><small>{session.year} / {session.country_name.toUpperCase()} / UTC</small></div></div>
      <div className="replay-buttons">
        <button className="icon-button replay-play" aria-label={playing ? 'Pause replay' : 'Play replay'} onClick={() => { if (!playing && cursor.current >= end) seek(start); setPlaying(!playing) }}>{playing ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}</button>
        <button className="icon-button" aria-label="Restart replay" onClick={() => { setPlaying(false); seek(start) }}><RotateCcw size={17}/></button>
      </div>
      <div className="replay-range">
        <input aria-label="Replay position" type="range" min={0} max={Math.round((end - start) / 1000)} step="1" value={Math.floor((time - start) / 1000)} onChange={event => seek(start + Number(event.target.value) * 1000)}/>
        <div><span>{elapsed((time - start) / 1000)}</span><time>{utcTime(time)} UTC</time><span>{elapsed((end - start) / 1000)}</span></div>
      </div>
      <div className="speed-select"><label htmlFor="replay-speed">Speed</label><select id="replay-speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}>{speeds.map(value => <option key={value} value={value}>{value}×</option>)}</select></div>
      {mode === 'race-control' && <button className="icon-button full-button" aria-label="Toggle fullscreen" onClick={() => { void (document.fullscreenElement ? document.exitFullscreen() : section.current?.requestFullscreen())?.catch(() => undefined) }}><Maximize2 size={17}/></button>}
    </section>
    {timing.errors.length > 0 && <Empty error action={<button className="button button-light" onClick={timing.retry}>Retry feed</button>}>{timing.errors[0]}</Empty>}
    {mode === 'race-control' && <>
      <div className="race-layout">
        <section className="panel timing-panel"><div className="panel-heading"><div><Flag size={17}/><h2>Timing tower</h2></div><span className="tag">LAP {leaderLap || '—'} / {maxLap || '—'}</span></div>
          {tower.length ? <div className="table-wrap"><table><thead><tr><th>Pos</th><th>Driver</th><th>Gap</th><th>Interval</th><th>Last</th><th>Best</th><th>Tyres</th><th>Pits</th></tr></thead>
          <tbody>{tower.map(item => {
            const number = item.driver.driver_number
            const previous = previousPositions.get(number)
            const change = item.position && previous ? previous - item.position : 0
            const age = item.stint && item.last?.lap_number && item.stint.lap_start !== undefined && item.stint.tyre_age_at_start !== undefined ?
              item.last.lap_number - item.stint.lap_start + item.stint.tyre_age_at_start + 1 : null
            return <tr key={number} className={number === selected ? 'selected' : ''}><td className={change > 0 ? 'gain' : change < 0 ? 'loss' : ''}>{item.position ?? '—'}</td>
              <td><button className="timing-driver" aria-pressed={number === selected} onClick={() => select(number)}><i style={{ background: teamColor(item.driver) }}/>{item.driver.name_acronym}</button></td>
              <td>{gap(item.interval?.gap_to_leader)}</td><td>{gap(item.interval?.interval)}</td><td>{lapTime(item.last?.lap_duration)}</td><td>{lapTime(item.best?.lap_duration)}</td>
              <td>{item.stint?.compound ? <span className={'tyre ' + item.stint.compound.toLowerCase()} title={item.stint.compound}>{item.stint.compound[0]}{age != null && <b>{age}</b>}</span> : '—'}</td><td>{item.stopCount ?? '—'}</td>
            </tr>
          })}</tbody></table></div> : timing.loading ? <Loading/> : <Empty>No classification is available yet.</Empty>}
        </section>
        <div className="race-right">
          <Track rows={track.rows ?? emptyRows} drivers={drivers} locations={window.locations} time={time} selected={selected} choose={select} loading={track.loading || (timing.loading && !trackQuery)} error={track.error ?? window.error}/>
          <section className="panel weather-panel"><div className="panel-heading"><div><Wind size={17}/><h2>Track conditions</h2></div>{currentWeather?.rainfall === 1 && <span className="tag"><CloudRain size={14}/>Rain</span>}</div>
            <div className="weather-grid">
              <div><Thermometer size={15}/><small>TRACK</small><b>{mark(currentWeather?.track_temperature)} °C</b></div>
              <div><Thermometer size={15}/><small>AIR</small><b>{mark(currentWeather?.air_temperature)} °C</b></div>
              <div><Wind size={15}/><small>WIND</small><b>{mark(currentWeather?.wind_speed)} m/s</b></div>
              <div><CloudRain size={15}/><small>HUMIDITY</small><b>{mark(currentWeather?.humidity)} %</b></div>
            </div>
          </section>
        </div>
      </div>
      <div className="race-layout race-events-layout">
        <section className="panel"><div className="panel-heading"><div><Radio size={17}/><h2>Race direction</h2></div></div>
          {currentEvents.length ? <ol className="event-list">{currentEvents.map((event, i) => <li key={event.date + '/' + i}><time>{utcTime(event.date)}</time><div><strong>{event.flag ?? event.category ?? 'Message'}</strong><p>{event.message ?? '—'}</p></div></li>)}</ol> :
            timing.loading ? <Loading/> : <Empty>No race direction messages at this point in the replay.</Empty>}
        </section>
        <section className="panel"><div className="panel-heading"><div><Timer size={17}/><h2>{driver ? driver.name_acronym + ' analysis' : 'Driver analysis'}</h2></div></div>
          <div className="sector-grid">{[1, 2, 3].map((sector, i) => <div key={sector}><small>SECTOR {sector}</small><b>{mark(tower.find(item => item.driver.driver_number === selected)?.last?.[['duration_sector_1', 'duration_sector_2', 'duration_sector_3'][i] as 'duration_sector_1'])}</b></div>)}</div>
          <ol className="event-list">{(timing.data.pit ?? []).filter(row => row.driver_number === selected && stamp(row) <= time).slice(-6).reverse().map((row, i) => {
            const lane = row.lane_duration ?? row.pit_duration
            return <li key={row.date + '/' + i}><time>{utcTime(row.date)}</time><div><strong>Pit stop · lap {mark(row.lap_number)}</strong><p>{lane == null ? 'Lane time unavailable' : lane + ' s in pit lane'}{row.stop_duration == null ? '' : ' · ' + row.stop_duration + ' s stationary'}</p></div></li>
          })}</ol>
          {overtakes.length > 0 && <div className="overtake-list"><small>OVERTAKES · OPENF1 FEED</small>{overtakes.slice(0, 4).map((row, i) => <p key={row.date + '/' + i}>{driversByNumber.get(row.overtaking_driver_number ?? 0)?.name_acronym ?? row.overtaking_driver_number} passed {driversByNumber.get(row.overtaken_driver_number ?? 0)?.name_acronym ?? row.overtaken_driver_number} · {utcTime(row.date)}</p>)}</div>}
        </section>
      </div>
    </>}
    {mode === 'telemetry' && <Suspense fallback={<Loading/>}>
      <div className="instrument-controls"><Select title="Driver" value={selected || ''} choices={drivers.map(driver => ({ value: driver.driver_number, label: driver.full_name }))} onChange={select}/><a className="button button-outline" href="#/compare"><Activity size={16}/> Compare drivers</a></div>
      <Telemetry driver={driver} samples={window.telemetry} time={time} laps={lapIndex.get(selected) ?? []} position={lastAt(window.locations.get(selected) ?? [], time)} error={window.error} retry={window.retry}/>
    </Suspense>}
    {mode === 'compare' && <Suspense fallback={<Loading/>}><Compare session={session} drivers={drivers} laps={laps} loading={timing.loading}/></Suspense>}
    {mode === 'radio' && <RadioView drivers={driversByNumber} rows={timing.data.team_radio ?? []} time={time} loading={timing.loading} seek={value => { setPlaying(false); seek(value) }}/>}
  </div>
}
function RadioView({ drivers, rows, time, seek, loading }: { drivers: Map<number, Driver>; rows: Timing[]; time: number; seek: (time: number) => void; loading: boolean }) {
  const [available, setAvailable] = useState(false)
  const visible = (available ? rows : rows.filter(row => stamp(row) <= time)).slice().reverse()
  return <section className="panel radio-panel"><div className="panel-heading"><div><Radio size={17}/><h2>Team radio archive</h2></div>
    <button className="button button-light" aria-pressed={available} onClick={() => setAvailable(!available)}>{available ? 'Show replay only' : 'Show all clips'}</button></div>
    {visible.length ? <div className="radio-list">{visible.map((row, i) => {
      const driver = drivers.get(row.driver_number ?? 0)
      const url = validUrl(row.recording_url)
      return <RadioClip key={row.date + '/' + i} driver={driver} row={row} url={url} seek={seek}/>
    })}</div> : loading ? <Loading/> : <Empty>{available ? 'No radio recordings are available for this session.' : 'No clips at this point in the replay.'}</Empty>}
  </section>
}
function RadioClip({ driver, row, url, seek }: { driver?: Driver; row: Timing; url?: string; seek: (time: number) => void }) {
  const audio = useRef<HTMLAudioElement>(null)
  const [failed, setFailed] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  return <article className="radio-clip">
    {driver && <Portrait driver={driver}/>}
    <div><strong>{driver?.full_name ?? 'Car ' + (row.driver_number ?? '—')}</strong><small>{driver?.team_name ?? 'Team radio'}</small></div>
    {url && !failed ? <>
      <button className="icon-button" aria-label={playing ? 'Pause radio clip' : 'Play radio clip'} onClick={() => { if (audio.current?.paused) void audio.current.play().catch(() => setFailed(true)); else audio.current?.pause() }}>{playing ? <Pause size={18}/> : <Play size={18}/>}</button>
      <progress aria-label="Radio clip progress" value={progress} max={1}/>
      <audio ref={audio} src={url} preload="none" onError={() => setFailed(true)} onPlay={() => {
        document.querySelectorAll<HTMLAudioElement>('.radio-clip audio').forEach(player => { if (player !== audio.current) player.pause() })
        setPlaying(true)
      }} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => {
        const player = audio.current
        if (player?.duration) setProgress(player.currentTime / player.duration)
      }}/>
    </> : <span className="muted">Recording unavailable</span>}
    <button className="button button-light" onClick={() => seek(stamp(row))}><Timer size={15}/>{utcTime(row.date)} UTC</button>
  </article>
}
