import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import gsap from 'gsap'
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Gauge, Layers3, Timer, Trophy } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { fastest, getPortrait, lapTime, loadPortraits, teamColor, type Driver, type SeasonDriver, type Session, type Timing } from './data'
import { useFeed } from './hooks'
import { Empty, Label, Loading, Portrait } from './UI'

const featured = ['NOR', 'HAM', 'VER', 'PIA', 'LEC', 'RUS', 'ALO']
export function featureOrder(drivers: Driver[]) {
  return [...drivers].sort((a, b) => {
    const rank = (driver: Driver) => (featured.includes(driver.name_acronym) ? featured.indexOf(driver.name_acronym) : featured.length)
    return rank(a) - rank(b) || a.driver_number - b.driver_number
  })
}
export function DriverCard({ driver, eager }: { driver: Driver; eager?: boolean }) {
  return <a className="driver-card" href={'#/drivers/' + driver.driver_number} aria-label={driver.full_name + ' · ' + driver.team_name} style={{ '--team': teamColor(driver) } as CSSProperties}>
    <Portrait driver={driver} eager={eager}/>
    <div className="driver-card-copy"><small><i/> {driver.team_name}</small><strong>{driver.full_name}</strong><ArrowRight size={20} aria-hidden/></div>
  </a>
}
export function Drivers({ drivers, year, controls, loading, error, retry }: { drivers: Driver[]; year: number; controls: ReactNode; loading: boolean; error?: string; retry: () => void }) {
  const strip = useRef<HTMLDivElement>(null)
  const [team, setTeam] = useState('')
  const [search, setSearch] = useState('')
  const season = useFeed<SeasonDriver>('season_drivers', { year })
  const teams = Array.from(new Set(drivers.map(driver => driver.team_name))).sort()
  const shown = featureOrder(drivers).filter(driver =>
    (!team || driver.team_name === team || !teams.includes(team)) &&
    (driver.full_name.toLowerCase().includes(search.trim().toLowerCase()) || String(driver.driver_number) === search.trim()))
  function scroll(direction: number) {
    const element = strip.current
    element?.scrollBy({ left: direction * (element.clientWidth * .72), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }
  return <>
    <div className="section-title"><div><Label>DRIVER LINEUP</Label><h1>Meet the <em>grid.</em></h1></div>
      <div className="carousel-nav"><button className="icon-button" aria-label="Previous drivers" onClick={() => scroll(-1)} disabled={!shown.length}><ChevronLeft size={20}/></button><button className="icon-button" aria-label="Next drivers" onClick={() => scroll(1)} disabled={!shown.length}><ChevronRight size={20}/></button></div>
    </div>
    {controls}
    <div className="driver-filters">
      <label><span>Find driver</span><input type="search" placeholder="Name or car number" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <label><span>Team</span><select value={teams.includes(team) ? team : ''} onChange={event => setTeam(event.target.value)}><option value="">All teams</option>{teams.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    {loading ? <Loading>Acquiring the grid</Loading> : error ? <Empty error action={<button className="button button-light" onClick={retry}>Retry</button>}>{error}</Empty> :
      shown.length ? <div ref={strip} className="driver-strip full-strip" aria-label="Season driver carousel" tabIndex={0}>{shown.map((driver, index) => <DriverCard key={driver.driver_number} driver={driver} eager={index < 4}/>)}</div>
        : <Empty>No drivers match this selection.</Empty>}
    {shown.length > 0 && <div className="driver-index">{shown.map(driver => <a key={driver.driver_number} href={'#/drivers/' + driver.driver_number}><b style={{ color: teamColor(driver) }}>{String(driver.driver_number).padStart(2, '0')}</b><span>{driver.full_name}</span><small>{driver.team_name}</small></a>)}</div>}
    {!!season.rows?.length && <details className="season-roster"><summary>{year} season entries · {season.rows.length} drivers</summary><ul>{season.rows.map(driver =>
      <li key={driver.id}><b>{driver.code || driver.number || '—'}</b><span>{driver.firstName} {driver.lastName}</span><small>{driver.nationality}</small></li>
    )}</ul></details>}
  </>
}
export function DriverProfile({ driver, session, loading }: { driver?: Driver; session?: Session; loading: boolean }) {
  const profile = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const query = driver && session ? { session: session.session_key, driver: driver.driver_number } : undefined
  const laps = useFeed<Timing>('laps', query)
  const results = useFeed<Timing>('session_result', query)
  const pits = useFeed<Timing>('pit', query)
  const season = useFeed<SeasonDriver>('season_drivers', session ? { year: session.year } : undefined)
  const [ready, setReady] = useState(false)
  useEffect(() => { let active = true; void loadPortraits().then(() => { if (active) setReady(true) }); return () => { active = false } }, [])
  useEffect(() => {
    if (reduced || !driver || !profile.current) return
    const context = gsap.context(() => {
      gsap.timeline({ defaults: { ease: 'power3.out', clearProps: 'opacity,transform,clipPath' } })
        .from('.profile-hero .portrait', { clipPath: 'inset(0 0 0 100%)', duration: .75 })
        .from('.profile-copy > *', { y: 18, opacity: 0, duration: .48, stagger: .07 }, .11)
        .from('.profile-metrics > div', { y: 9, opacity: .35, duration: .42, stagger: .055 }, .31)
    }, profile)
    return () => context.revert()
  }, [driver, reduced])
  if (!driver) return loading ? <Loading/> : <Empty>Driver unavailable in this session. <a href="#/drivers">Choose a driver</a></Empty>
  const portrait = ready ? getPortrait(driver) : undefined
  const best = fastest(laps.rows ?? [])
  const nationality = season.rows?.find(item => item.code === driver.name_acronym)?.nationality
  const speed = Math.max(0, ...(laps.rows ?? []).flatMap(lap => [lap.st_speed ?? 0, lap.i1_speed ?? 0, lap.i2_speed ?? 0]))
  const telemetryUrl = '#/telemetry/' + driver.driver_number
  return <div className="profile" ref={profile} style={{ '--team': teamColor(driver) } as CSSProperties}>
    <a className="text-link" href="#/drivers"><ArrowLeft size={17}/> All drivers</a>
    <div className="profile-hero"><div className="profile-copy"><Label>{driver.team_name}{nationality ? ' · ' + nationality : ''}</Label><h1>{driver.first_name}<br/><em>{driver.last_name}</em></h1><p>{session?.circuit_short_name} · {session?.session_name} · {session?.year}</p><a className="button" href={telemetryUrl}><Gauge size={17}/> Explore telemetry</a></div><Portrait driver={driver} eager/></div>
    <div className="metric-grid profile-metrics">
      <div><Trophy size={19}/><small>SESSION POSITION</small><strong>{results.rows?.[0]?.position ?? '—'}</strong></div>
      <div><Timer size={19}/><small>BEST LAP</small><strong>{lapTime(best?.lap_duration)}</strong></div>
      <div><Gauge size={19}/><small>PEAK SPEED TRAP</small><strong>{speed ? speed + ' km/h' : '—'}</strong></div>
      <div><Layers3 size={19}/><small>PIT STOPS</small><strong>{pits.rows?.length ?? '—'}</strong></div>
    </div>
    {(laps.error || results.error || pits.error) && <Empty>Some session statistics are temporarily unavailable.</Empty>}
    {portrait && <p className="muted photo-credit"><a href={portrait.source} target="_blank" rel="noreferrer">{portrait.author || 'Wikimedia Commons'} · {portrait.license}</a></p>}
  </div>
}
export function Credits() {
  const [portraits, setPortraits] = useState<{ file: string; source: string; license: string; author: string }[]>([])
  useEffect(() => {
    const controller = new AbortController()
    fetch('/portraits/credits.json', { signal: controller.signal }).then(response => response.ok ? response.json() : {})
      .then((rows: Record<string, typeof portraits[number]>) => setPortraits([...new Map(Object.values(rows).map(row => [row.file, row])).values()]))
      .catch(() => undefined)
    return () => controller.abort()
  }, [])
  return <section className="shell interior credits">
    <Label>PROJECT SOURCES</Label><h1>Data &amp; <em>credits.</em></h1>
    <p>Formula 1 session data and team radio recordings come from <a href="https://openf1.org/docs/">OpenF1</a>. Season entries and nationalities come from <a href="https://github.com/jolpica/jolpica-f1">Jolpica F1</a>. The concept car image and procedural 3D model were created for this project.</p>
    <p>Driver photographs sourced from Wikimedia Commons have been resized and may be cropped in the interface. License details and original files are listed on each source page.</p>
    <ul>{portraits.map(row => <li key={row.file}><a href={row.source}>{row.file.split('/').at(-1)?.replace('.webp', '').replaceAll('-', ' ')} · {row.author || 'Wikimedia Commons'} · {row.license}</a></li>)}</ul>
  </section>
}
