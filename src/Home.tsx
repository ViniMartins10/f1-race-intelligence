import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from 'motion/react'
import { ArrowRight, Box, CalendarDays, ChevronLeft, ChevronRight, Flag, Gauge, Play, Radio, Timer, X } from 'lucide-react'
import { date, dateLabel, elapsed, utcTime, type Driver, type Meeting, type Session } from './data'
import { DriverCard, featureOrder } from './Drivers'
import { Empty, hasWebGl, Label, Loading } from './UI'

const CarScene = lazy(() => import('./CarScene'))
type Props = { session?: Session; next?: Meeting; nextSession?: Session; drivers: Driver[]; loading: boolean; error?: string; retry: () => void }
export function Home({ session, next, nextSession, drivers, loading, error, retry }: Props) {
  const hero = useRef<HTMLElement>(null)
  const modelDialog = useRef<HTMLDialogElement>(null)
  const strip = useRef<HTMLDivElement>(null)
  const [model, setModel] = useState(false)
  const [clock, setClock] = useState(Date.now)
  const reduced = useReducedMotion()
  const displayDrivers = featureOrder(drivers)
  const nextTime = nextSession?.date_start ?? next?.date_start
  const remaining = Math.max(0, (date(nextTime) - clock) / 1000)
  const days = Math.floor(remaining / 86400)
  useEffect(() => { const id = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(id) }, [])
  useEffect(() => {
    if (reduced || !hero.current) return
    gsap.registerPlugin(ScrollTrigger)
    const context = gsap.context(() => {
      gsap.from('.hero-in', { y: 27, opacity: 0, duration: .62, stagger: .07, ease: 'power3.out', clearProps: 'opacity,transform' })
      gsap.to('.hero-image', { yPercent: 8, scale: 1.05, ease: 'none', scrollTrigger: { trigger: hero.current, start: 'top top', end: 'bottom top', scrub: .6 } })
    }, hero)
    return () => context.revert()
  }, [reduced])
  function moveStrip(direction: number) {
    const element = strip.current
    element?.scrollBy({ left: direction * Math.max(240, element.clientWidth * .72), behavior: reduced ? 'instant' : 'smooth' })
  }
  function openModel() { setModel(hasWebGl()); modelDialog.current?.showModal() }

  return <>
    <section className="hero" ref={hero} onPointerMove={event => {
      if (reduced || event.pointerType !== 'mouse') return
      const rect = event.currentTarget.getBoundingClientRect()
      event.currentTarget.style.setProperty('--pointer-x', ((event.clientX - rect.left) / rect.width - .5) * 12 + 'px')
      event.currentTarget.style.setProperty('--pointer-y', ((event.clientY - rect.top) / rect.height - .5) * 8 + 'px')
    }} onPointerLeave={event => { event.currentTarget.style.setProperty('--pointer-x', '0px'); event.currentTarget.style.setProperty('--pointer-y', '0px') }}>
      <div className="hero-image" aria-hidden="true"><img src="/hero-car.webp" alt="" fetchPriority="high"/></div>
      <div className="hero-scrim"/>
      <div className="shell hero-inner">
        <div className="hero-copy">
          <div className="hero-in"><Label>FORMULA 1 · DATA EXPERIENCE</Label></div>
          <h1 className="hero-in">BEYOND THE<br/><em>FINISH LINE<span>.</span></em></h1>
          <p className="hero-in">Every driver. Every lap. Every millisecond.</p>
          <div className="hero-actions hero-in">
            <a className="button" href="#/race-control"><Play size={16} fill="currentColor"/> Launch race replay</a>
            <a className="button button-outline" href="#/drivers">Explore drivers</a>
          </div>
        </div>
        <div className="hero-corner">
          <button className="model-toggle" onClick={openModel}><Box size={15}/> VIEW 3D CAR</button>
          <span className="hero-guides" aria-hidden><i/><i/><i/><i/></span>
        </div>
        <div className="hero-bottom"><span><i/> OPENF1 DATA FEED</span><span className="edition">RACE INTELLIGENCE <b> / </b> GRID VIEW</span></div>
      </div>
    </section>

    <section className="trackline" aria-label="Timing and schedule">
      <div className="shell trackline-inner">
        <div className="trackline-cell trackline-intro"><span className="icon-frame"><Flag size={21}/></span><div><small>NEXT GRAND PRIX</small><strong>{next?.meeting_name ?? 'Schedule pending'}</strong></div></div>
        <div className="trackline-cell"><CalendarDays size={17}/><div><small>{nextSession?.session_name?.toUpperCase() ?? 'SCHEDULE'}</small><strong>{nextTime ? dateLabel(nextTime) : 'Awaiting data'}</strong>{nextSession && <span className="schedule-time">{utcTime(nextSession.date_start).slice(0, 5)} UTC</span>}</div></div>
        <div className="trackline-cell"><Timer size={17}/><div><small>{nextTime && date(nextTime) > clock ? 'COUNTDOWN' : 'SESSION TIME'}</small><strong>{nextTime && date(nextTime) > clock ? (days ? days + 'D ' : '') + elapsed(remaining % 86400) : nextTime ? utcTime(nextTime) + ' UTC' : '—'}</strong></div></div>
        <div className="trackline-cell trackline-status"><Radio size={17}/><div><small>DATA MODE</small><strong><i/> Historical replay</strong></div></div>
        <a className="trackline-link" href="#/calendar">Calendar <ArrowRight size={16}/></a>
      </div>
    </section>

    <section className="shell grid-section">
      <div className="section-title">
        <div><Label>{session ? session.year + ' DRIVER LINEUP' : 'DRIVER LINEUP'}</Label><h2>Meet the <em>grid.</em></h2></div>
        <div className="section-side"><a className="text-link" href="#/drivers">View all drivers <ArrowRight size={16}/></a>
          <div className="carousel-nav"><button className="icon-button" aria-label="Previous drivers" onClick={() => moveStrip(-1)} disabled={!drivers.length}><ChevronLeft size={20}/></button><button className="icon-button" aria-label="Next drivers" onClick={() => moveStrip(1)} disabled={!drivers.length}><ChevronRight size={20}/></button></div>
        </div>
      </div>
      {loading ? <Loading>Acquiring the grid</Loading> : error ? <Empty error action={<button className="button button-light" onClick={retry}>Retry</button>}>{error}</Empty> :
        drivers.length ? <div className="driver-strip" ref={strip} tabIndex={0} aria-label="Driver carousel">{displayDrivers.map((driver, index) => <DriverCard key={driver.driver_number} driver={driver} eager={index < 4}/>)}</div>
          : <Empty>Driver details will appear when the feed is available.</Empty>}
    </section>

    <section className="shell explore-section">
      <a className="explore-card" href="#/race-control"><Flag size={25}/><span><small>{session ? session.circuit_short_name.toUpperCase() + ' · ' + session.year : 'HISTORICAL REPLAY'}</small><strong>Race control</strong><p>Replay the timing tower, track positions and race direction.</p></span><ArrowRight size={24}/></a>
      <a className="explore-card" href="#/telemetry"><Gauge size={25}/><span><small>DRIVER DATA</small><strong>Telemetry</strong><p>Inspect speed, throttle, braking and gears across the session.</p></span><ArrowRight size={24}/></a>
    </section>

    <dialog ref={modelDialog} className="model-dialog" onClose={() => setModel(false)}>
      <div className="model-header"><Label>3D CAR CONCEPT</Label><button className="icon-button" aria-label="Close 3D car" onClick={() => modelDialog.current?.close()}><X size={21}/></button></div>
      <div className="model-view" style={{ '--fallback': 'url(/hero-car.webp)' } as CSSProperties}>
        {model ? <Suspense fallback={<Loading>Loading 3D model</Loading>}><CarScene/></Suspense> : <p>WebGL is unavailable on this device.</p>}
      </div>
    </dialog>
  </>
}
