import { Canvas, useFrame } from '@react-three/fiber'
import { Grid, Html, Line, OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import type { OrbitControls as Controls } from 'three-stdlib'
import { Vector3 } from 'three'
import type { Marker, Point } from './Track'

const toScene = (point: Point): [number, number, number] => [(point.x - 310) / 55, Math.max(0, point.z) / 44 + .025, (point.y - 162) / 55]
function CameraControls({ followed }: { followed?: Point }) {
  const orbit = useRef<Controls>(null)
  const target = useRef(new Vector3())
  useFrame((_, delta) => {
    if (!followed || !orbit.current) return
    target.current.set(...toScene(followed))
    orbit.current.target.lerp(target.current, Math.min(1, delta * 4))
  })
  return <OrbitControls ref={orbit} minDistance={2} maxDistance={23} maxPolarAngle={Math.PI / 2.03}/>
}
export default function TrackScene({ points, markers, followed, selected, choose }: {
  points: Point[]; markers: Marker[]; followed?: Point; selected: number; choose: (driver: number) => void
}) {
  return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 9, 9], fov: 47 }} fallback={<p>3D requires WebGL. Choose 2D to view the circuit.</p>}>
    <color attach="background" args={['#111411']}/>
    <Grid args={[16, 10]} cellColor="#232b21" sectionColor="#313b2c" sectionSize={2} cellSize={.5} fadeDistance={23}/>
    <Line points={points.map(toScene)} color="#838c72" lineWidth={5}/>
    <Line points={points.map(toScene)} color="#303b2b" lineWidth={2}/>
    {markers.map(marker => <Html key={marker.driver.driver_number} position={toScene(marker)} center zIndexRange={[20, 0]}>
      <button className="marker-3d" aria-label={'Follow ' + marker.driver.full_name} onClick={() => choose(marker.driver.driver_number)} aria-pressed={selected === marker.driver.driver_number} style={{ background: marker.color }}>{marker.driver.driver_number}</button>
    </Html>)}
    <CameraControls followed={followed}/>
  </Canvas>
}
