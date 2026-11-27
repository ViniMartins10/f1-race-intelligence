import { Gauge, Signal, Timer } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { finishedLaps, lapTime, lastAt, mark, stamp, teamColor, utcTime, type Driver, type Timing } from './data'
import { Empty, Portrait } from './UI'

const tooltip = { background: '#151816', border: '1px solid #363c32', color: '#e8ebe1' }
function Pedal({ name, value, color }: { name: string; value?: number; color: string }) {
  return <div className="pedal"><div><span>{name}</span><b>{value == null ? '—' : value + '%'}</b></div><progress max={100} value={value ?? 0} aria-label={name} style={{ accentColor: color }}/></div>
}
export default function Telemetry({ driver, samples, time, laps, position, error, retry }: { driver?: Driver; samples: Timing[]; time: number; laps: Timing[]; position?: Timing; error?: string; retry: () => void }) {
  const last = lastAt(samples, time)
  const current = last && time - stamp(last) < 3000 ? last : undefined
  const toNow = samples.filter(row => stamp(row) <= time)
  const chart = toNow.filter((_, index) => index % 4 === 0 || index === toNow.length - 1).map(sample => ({
    time: utcTime(stamp(sample)), speed: sample.speed, rpm: sample.rpm,
  }))
  const color = teamColor(driver)
  const latestLap = finishedLaps(laps, time).at(-1)
  const drs = current?.drs === undefined ? '—' : [10, 12, 14].includes(current.drs) ? 'OPEN' : current.drs === 8 ? 'AVAILABLE' : 'CLOSED'
  const distance = toNow.length > 1 ? toNow.slice(1).reduce((total, sample, index) => {
    const previous = toNow[index]
    const seconds = (stamp(sample) - stamp(previous)) / 1000
    return total + (seconds < 2 && previous.speed != null && sample.speed != null ? (previous.speed + sample.speed) / 7.2 * seconds : 0)
  }, 0) : undefined
  return <>
    {error && <Empty error action={<button className="button button-light" onClick={retry}>Retry telemetry</button>}>{error}</Empty>}
    <div className="telemetry-layout">
      <section className="panel driver-signal"><div className="panel-heading"><div><Signal size={17}/><h2>Driver channel</h2></div></div>
        {driver ? <><Portrait driver={driver} eager/><div className="driver-signal-copy"><small>{driver.team_name}</small><strong>{driver.full_name}</strong></div></> : <Empty>Choose a driver.</Empty>}
      </section>
      <section className="panel telemetry-pod">
        <div className="panel-heading"><div><Gauge size={17}/><h2>Onboard instruments</h2></div><span className="tag">{current ? 'RECORDED SAMPLE' : 'AWAITING SAMPLE'}</span></div>
        <div className="rev-lights" role="img" aria-label={current?.rpm ? current.rpm + ' revolutions per minute' : 'RPM unavailable'}>{Array.from({ length: 15 }, (_, index) => <i key={index} className={current?.rpm && current.rpm / 12500 * 15 > index ? 'on' : undefined}/>)}</div>
        <div className="instrument-cluster">
          <div><small>RPM</small><strong>{mark(current?.rpm)}</strong></div>
          <div className="speedometer"><strong>{mark(current?.speed)}</strong><small>KM/H</small></div>
          <div><small>GEAR</small><strong>{current?.n_gear === 0 ? 'N' : mark(current?.n_gear)}</strong></div>
        </div>
        <div className="pedals"><Pedal name="Throttle" value={current?.throttle} color={color}/><Pedal name="Brake" value={current?.brake} color="#ec6059"/></div>
        <div className="instrument-foot"><span>DRS <b>{drs}</b></span><span><Timer size={15}/> LAST LAP <b>{lapTime(latestLap?.lap_duration)}</b></span><span>WINDOW DISTANCE <b>{distance == null ? '—' : Math.round(distance) + ' m est.'}</b></span><span>TRACK X/Y <b>{position?.x == null || position.y == null ? '—' : Math.round(position.x) + ' / ' + Math.round(position.y)}</b></span></div>
      </section>
    </div>
    <section className="panel chart-panel"><div className="panel-heading"><div><Gauge size={17}/><h2>Speed trace</h2></div><span className="tag">KM/H</span></div>
      {chart.length > 1 ? <ResponsiveContainer width="100%" height={290}><AreaChart data={chart} margin={{ top: 16, right: 22, bottom: 15, left: 0 }}>
        <CartesianGrid stroke="#32362e" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="time" minTickGap={30} stroke="#a3aa9a"/><YAxis stroke="#a3aa9a" />
        <Tooltip contentStyle={tooltip}/><Area type="monotone" dataKey="speed" name="Speed (km/h)" stroke={color} fill={color} fillOpacity={.12} isAnimationActive={false} connectNulls={false} />
      </AreaChart></ResponsiveContainer> : <Empty>Start playback or seek to a timestamp with recorded telemetry.</Empty>}
    </section>
  </>
}
