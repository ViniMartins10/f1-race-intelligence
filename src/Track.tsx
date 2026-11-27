import { lazy, Suspense, useMemo, useState } from 'react'
import { Box, Crosshair, Map as MapIcon, Minus, Plus } from 'lucide-react'
import { stamp, teamColor, type Driver, type Timing } from './data'
import { Empty, hasWebGl, Loading } from './UI'
export type Point = { x: number; y: number; z: number }
export type Marker = Point & { driver: Driver; color: string }
const TrackScene = lazy(() => import('./TrackScene'))
const usable = (row: Timing): row is Timing & Required<Pick<Timing, 'x' | 'y'>> => Number.isFinite(row.x) && Number.isFinite(row.y)

function pointAt(rows: Timing[], time: number): Point | undefined {
  let i = rows.findIndex(row => stamp(row) > time)
  if (i < 0) i = rows.length
  const start = rows[i - 1]
  const end = rows[i]
  if (!start || !usable(start) || time - stamp(start) > 4500) return
  const fraction = end && usable(end) && stamp(end) - stamp(start) < 4500 ?
    Math.max(0, Math.min(1, (time - stamp(start)) / (stamp(end) - stamp(start)))) : 0
  return {
    x: start.x + ((end?.x ?? start.x) - start.x) * fraction,
    y: start.y + ((end?.y ?? start.y) - start.y) * fraction,
    z: (start.z ?? 0) + ((end?.z ?? start.z ?? 0) - (start.z ?? 0)) * fraction,
  }
}
export function Track({ rows, drivers, locations, time, selected, choose, loading, error }: {
  rows: Timing[]; drivers: Driver[]; locations: Map<number, Timing[]>; time: number; selected: number
  choose: (number: number) => void; loading: boolean; error?: string
}) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [follow, setFollow] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [noGl, setNoGl] = useState(false)
  const circuit = useMemo(() => {
    const geometric = rows.filter(usable)
    if (geometric.length < 8) return undefined
    const minX = Math.min(...geometric.map(row => row.x))
    const maxX = Math.max(...geometric.map(row => row.x))
    const minY = Math.min(...geometric.map(row => row.y))
    const maxY = Math.max(...geometric.map(row => row.y))
    const minZ = Math.min(...geometric.map(row => row.z ?? 0))
    const width = maxX - minX
    const height = maxY - minY
    const rotate = height > width
    const scale = Math.min(512 / Math.max(1, rotate ? height : width), 259 / Math.max(1, rotate ? width : height))
    const project = (point: Point) => {
      const x = point.x - (minX + maxX) / 2
      const y = point.y - (minY + maxY) / 2
      return { x: 310 + (rotate ? y : x) * scale, y: 163 + (rotate ? x : -y) * scale, z: (point.z - minZ) * scale }
    }
    const points = geometric.map(row => project({ x: row.x, y: row.y, z: row.z ?? 0 }))
    return { points, project }
  }, [rows])
  const markers = circuit ? drivers.flatMap(driver => {
    const live = pointAt(locations.get(driver.driver_number) ?? [], time)
    return live ? [{ ...circuit.project(live), driver, color: teamColor(driver) }] : []
  }).sort((a, b) => Number(a.driver.driver_number === selected) - Number(b.driver.driver_number === selected)) : []
  const followed = follow ? markers.find(driver => driver.driver.driver_number === selected) : undefined
  const center = { x: followed?.x ?? 310, y: followed?.y ?? 162 }
  const display = circuit ? [center.x - 310 / zoom, center.y - 162 / zoom, 620 / zoom, 324 / zoom].join(' ') : '0 0 620 324'
  return <section className="panel track-panel">
    <div className="panel-heading"><div><MapIcon size={17}/><h2>Track map</h2></div><div className="segmented">
      <button aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D</button>
      <button aria-pressed={mode === '3d'} onClick={() => { if (hasWebGl()) setMode('3d'); else setNoGl(true) }}><Box size={14}/> 3D</button>
    </div></div>
    {noGl && <p className="instrument-note">3D requires WebGL. The 2D circuit remains available.</p>}
    <div className="track-viewport">
      {!circuit ? loading ? <Loading>Reconstructing the circuit</Loading> : <Empty error={Boolean(error)}>{error ?? 'This session does not have a complete location lap.'}</Empty> :
        mode === '3d' ? <Suspense fallback={<Loading/>}><TrackScene points={circuit.points} markers={markers} followed={followed} selected={selected} choose={choose}/></Suspense> :
        <svg viewBox={display} role="group" aria-label="Reconstructed circuit and driver positions">
          <polyline points={circuit.points.map(point => point.x + ',' + point.y).join(' ')} fill="none" stroke="#0a0b0b" strokeWidth="17" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
          <polyline points={circuit.points.map(point => point.x + ',' + point.y).join(' ')} fill="none" stroke="#89907b" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
          <polyline points={circuit.points.map(point => point.x + ',' + point.y).join(' ')} fill="none" stroke="#283025" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
          <circle cx={circuit.points[0].x} cy={circuit.points[0].y} r="5" fill="#d5f940" />
          {markers.map(({ x, y, driver, color }) => <g key={driver.driver_number} role="button" tabIndex={0} aria-label={'Follow ' + driver.full_name}
            onClick={() => choose(driver.driver_number)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(driver.driver_number) } }}
            className="track-marker" transform={'translate(' + x + ' ' + y + ') scale(' + (1 / zoom) + ')'}>
            <circle r={driver.driver_number === selected ? 10 : 8} fill={color} stroke={driver.driver_number === selected ? 'white' : '#161817'} strokeWidth={driver.driver_number === selected ? 2 : 1}/>
            <text y=".3em" textAnchor="middle" fill="#060706">{driver.driver_number}</text>
          </g>)}
        </svg>}
      {circuit && mode === '2d' && <div className="track-tools"><button className="icon-button" aria-label="Zoom in" onClick={() => setZoom(zoom => Math.min(zoom * 1.3, 5))}><Plus size={17}/></button><button className="icon-button" aria-label="Zoom out" onClick={() => setZoom(zoom => Math.max(zoom / 1.3, 1))}><Minus size={17}/></button></div>}
    </div>
    <div className="track-footer"><span>Approximate trace from OpenF1 location samples</span><button className="button button-light" aria-pressed={follow} disabled={!selected} onClick={() => setFollow(!follow)}><Crosshair size={15}/> {follow ? 'Following' : 'Follow driver'}</button></div>
  </section>
}
