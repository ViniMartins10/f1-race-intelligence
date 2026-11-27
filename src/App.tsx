import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import Lenis from 'lenis'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AudioLines, CalendarDays, Flag, Gauge, Menu, Radio, X } from 'lucide-react'
import { date, type Driver, type Meeting, type Session } from './data'
import { useFeed } from './hooks'
import { Home } from './Home'
import { Empty, Loading, Mark, Select } from './UI'
import { Drivers, DriverProfile, Credits } from './Drivers'
import { Calendar } from './Calendar'

const Cockpit = lazy(() => import('./Cockpit'))
const navigation = [
  ['Overview', ''], ['Drivers', 'drivers'], ['Race Control', 'race-control'], ['Telemetry', 'telemetry'], ['Calendar', 'calendar'],
] as const
const initialYear = 2025
const nowYear = new Date().getUTCFullYear()
const years = Array.from({ length: Math.max(1, nowYear - 2022) }, (_, index) => nowYear - index)
const readRoute = () => location.hash.slice(1).replace(/^\/+/, '').split('/')
const href = (route: string) => '#/' + route

export default function App() {
  const [route, setRoute] = useState(readRoute)
  const [menu, setMenu] = useState(false)
  const [selection, setSelection] = useState({ year: initialYear, meeting: 0, session: 0 })
  const reduced = useReducedMotion()
  const page = route[0] || ''
  const cockpit = page === 'race-control' || page === 'telemetry' || page === 'compare' || page === 'radio'
  useEffect(() => {
    const listener = () => { setRoute(readRoute()); setMenu(false); window.scrollTo({ top: 0, behavior: 'instant' }) }
    window.addEventListener('hashchange', listener)
    return () => window.removeEventListener('hashchange', listener)
  }, [])
  useEffect(() => {
    if (reduced) return
    const lenis = new Lenis({ autoRaf: true, duration: .8 })
    return () => lenis.destroy()
  }, [reduced])

  const sessionsData = useFeed<Session>('sessions', { year: selection.year })
  const currentMeetings = useFeed<Meeting>('meetings', { year: nowYear })
  const followingMeetings = useFeed<Meeting>('meetings', { year: nowYear + 1 })
  const schedule = useFeed<Meeting>('meetings', page === 'calendar' ? { year: selection.year } : undefined)
  const sessions = useMemo(() => (sessionsData.rows ?? []).filter(session => date(session.date_end) <= Date.now()), [sessionsData.rows])
  const meetingChoices = useMemo(() => {
    const races = sessions.filter(session => session.session_type === 'Race' || session.session_name === 'Race')
    return [...new Map(races.map(race => [race.meeting_key, race])).values()].sort((a, b) => date(b.date_start) - date(a.date_start))
  }, [sessions])
  const meeting = meetingChoices.find(race => race.meeting_key === selection.meeting)
    ?? meetingChoices.find(race => race.year === initialYear && race.circuit_short_name === 'Silverstone') ?? meetingChoices[0]
  const candidates = sessions.filter(s => s.meeting_key === meeting?.meeting_key).sort((a, b) => date(a.date_start) - date(b.date_start))
  const session = candidates.find(s => s.session_key === selection.session) ?? candidates.find(s => s.session_name === 'Race') ?? candidates.at(-1)
  const roster = useFeed<Driver>('drivers', session ? { session: session.session_key } : undefined)
  const drivers = useMemo(() => [...new Map((roster.rows ?? []).map(driver => [driver.driver_number, driver])).values()], [roster.rows])
  const next = [...(currentMeetings.rows ?? []), ...(followingMeetings.rows ?? [])].filter(event => date(event.date_end || event.date_start) >= Date.now())
    .sort((a, b) => date(a.date_start) - date(b.date_start))[0]
  const nextSessions = useFeed<Session>('sessions', page === '' && next ? { meeting: next.meeting_key } : undefined)
  const nextSession = nextSessions.rows?.filter(item => date(item.date_start) > Date.now()).sort((a, b) => date(a.date_start) - date(b.date_start))[0]
  const catalogError = sessionsData.error
  const selectedDriver = drivers.find(driver => driver.driver_number === Number(route[1]))
  const sessionControls = <div className="session-controls">
    <Select title="Season" value={selection.year} choices={years.map(year => ({ value: year, label: String(year) }))} onChange={year => setSelection({ year, meeting: 0, session: 0 })}/>
    <Select title="Grand Prix" value={meeting?.meeting_key ?? ''} choices={meetingChoices.map(race => ({ value: race.meeting_key, label: race.country_name + ' · ' + race.circuit_short_name }))} onChange={meeting => setSelection(old => ({ ...old, meeting, session: 0 }))}/>
    <Select title="Session" value={session?.session_key ?? ''} choices={candidates.map(s => ({ value: s.session_key, label: s.session_name }))} onChange={session => setSelection(old => ({ ...old, session }))}/>
  </div>
  function openRace(event: Meeting) {
    setSelection({ year: event.year, meeting: event.meeting_key, session: 0 })
    location.hash = '/race-control'
  }
  return <>
    <a className="skip" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <header className="site-header">
      <div className="shell header-inner">
        <a className="logo" href={href('')} aria-label="F1 Race Intelligence home"><Mark/><span>RACE<span>INTELLIGENCE</span><small>F1 DATA PLATFORM</small></span></a>
        <nav className={'main-nav' + (menu ? ' is-open' : '')} aria-label="Main navigation">
          {navigation.map(([label, target]) => <a key={target} href={href(target)} aria-current={page === target ? 'page' : undefined}>{label}</a>)}
        </nav>
        <a className="button button-small header-action" href={href('race-control')}><Radio size={15}/> Launch replay</a>
        <button className="icon-button mobile-menu" aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X size={23}/> : <Menu size={23}/>}</button>
      </div>
    </header>
    <main id="main-content" tabIndex={-1}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={cockpit ? 'timing' : page + (page === 'drivers' ? route[1] ?? '' : '')} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? { opacity: 1 } : { opacity: 0 }} transition={{ duration: .15 }}>
          {page === '' && <Home session={session} next={next} nextSession={nextSession} drivers={drivers} loading={roster.loading || sessionsData.loading} error={catalogError ?? roster.error} retry={catalogError ? sessionsData.retry : roster.retry}/>}
          {page === 'drivers' && <section className="shell interior">
            {route[1] ? <DriverProfile driver={selectedDriver} session={session} loading={sessionsData.loading || roster.loading}/> : <Drivers drivers={drivers} year={selection.year} controls={sessionControls} loading={sessionsData.loading || roster.loading} error={catalogError ?? roster.error} retry={catalogError ? sessionsData.retry : roster.retry}/>}
          </section>}
          {cockpit && <section className="shell interior cockpit-shell">
            <div className="section-title cockpit-title"><div><span className="mode-chip"><i/> Historical replay</span><h1>{page === 'race-control' ? 'Race control' : page === 'telemetry' ? 'Telemetry' : page === 'compare' ? 'Compare drivers' : 'Team radio'}</h1></div>
            <span className="cockpit-source"><Radio size={15}/> OPENF1 TIMING</span></div>
            {sessionControls}
            <nav className="subnav" aria-label="Timing views">
              {[['race-control', 'Race control', Flag], ['telemetry', 'Telemetry', Gauge], ['compare', 'Compare', AudioLines], ['radio', 'Team radio', Radio]].map(([target, label, Icon]) => {
                const Glyph = Icon as typeof Flag
                return <a key={String(target)} href={href(String(target))} aria-current={target === page ? 'page' : undefined}><Glyph size={15}/>{String(label)}</a>
              })}
            </nav>
            {session ? <Suspense fallback={<Loading/>}><Cockpit key={session.session_key} mode={page} session={session} drivers={drivers} initialDriver={Number(route[1]) || 0}/></Suspense>
              : sessionsData.loading ? <Loading/> : <Empty error={!!catalogError} action={catalogError && <button className="button button-light" onClick={sessionsData.retry}>Retry</button>}>{catalogError ?? 'There are no completed sessions for this season.'}</Empty>}
          </section>}
          {page === 'calendar' && <Calendar year={selection.year} seasons={years} meetings={schedule.rows ?? []} loading={schedule.loading} error={schedule.error} retry={schedule.retry} setYear={year => setSelection({ year, meeting: 0, session: 0 })} openRace={openRace}/>}
          {page === 'credits' && <Credits/>}
          {!cockpit && !['', 'drivers', 'calendar', 'credits'].includes(page) && <section className="shell interior"><Empty>This page is unavailable. <a href="#/">Return to overview</a></Empty></section>}
        </motion.div>
      </AnimatePresence>
    </main>
    <footer className="site-footer"><div className="shell footer-inner">
      <a className="logo" href="#/"><Mark/><span>RACE<span>INTELLIGENCE</span></span></a>
      <p>Independent, educational project. Unaffiliated with Formula 1, the FIA, teams or drivers.</p>
      <div><a href="#/calendar"><CalendarDays size={14}/> Calendar</a><a href="#/credits">Data &amp; credits</a></div>
    </div></footer>
  </>
}
