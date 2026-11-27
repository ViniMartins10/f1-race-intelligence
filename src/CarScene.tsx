import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { Focus, Move, RotateCw } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { DataTexture, DoubleSide, LinearFilter, MeshPhysicalMaterial, Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import CarModel from './CarModel'

const views = {
  studio: { title: 'Three-quarter', position: [4.38, 2.25, 5.7] },
  side: { title: 'Side', position: [8.12, 1.86, .17] },
  overhead: { title: 'Overhead', position: [0, 9.25, .21] },
} as const
type View = keyof typeof views
const focus = new Vector3(0, .41, .04)
const cameras = Object.fromEntries(Object.entries(views).map(([key, view]) =>
  [key, new Vector3(...view.position)])) as Record<View, Vector3>

function StudioCamera({ view, revision, spin, reduced, onManual }: {
  view: View; revision: number; spin: boolean; reduced: boolean; onManual: () => void
}) {
  const orbit = useRef<OrbitControlsImpl>(null)
  const moving = useRef(false)
  const invalidate = useThree(state => state.invalidate)
  const aspect = useThree(state => state.size.width / Math.max(1, state.size.height))
  const framing = Math.min(2, Math.max(1, 1.19 / Math.max(.1, aspect)))
  const destination = useMemo(() => cameras[view].clone().sub(focus).multiplyScalar(framing).add(focus), [view, framing])
  useEffect(() => {
    moving.current = true
    invalidate()
  }, [destination, revision, invalidate])

  useFrame(({ camera }, dt) => {
    if (!orbit.current || !moving.current) return
    const amount = reduced ? 1 : 1 - Math.exp(-dt * 6.4)
    camera.position.lerp(destination, amount)
    orbit.current.target.lerp(focus, amount)
    if (camera.position.distanceToSquared(destination) < .00005) {
      camera.position.copy(destination)
      orbit.current.target.copy(focus)
      moving.current = false
    }
    orbit.current.update()
    if (moving.current) invalidate()
  })

  return <OrbitControls ref={orbit} target={[0, .41, .04]} enablePan={false} minDistance={3.6} maxDistance={20}
    minPolarAngle={.018} maxPolarAngle={Math.PI * .49} autoRotate={spin} autoRotateSpeed={.9}
    onStart={() => { moving.current = false; onManual() }}/>
}

function GroundShadows() {
  const texture = useMemo(() => {
    const size = 64
    const pixels = new Uint8Array(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const radius = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1)
        pixels[(y * size + x) * 4 + 3] = Math.round(255 * Math.max(0, 1 - radius * radius) ** 3)
      }
    }
    const shadow = new DataTexture(pixels, size, size)
    shadow.magFilter = LinearFilter
    shadow.minFilter = LinearFilter
    shadow.needsUpdate = true
    return shadow
  }, [])
  useEffect(() => () => texture.dispose(), [texture])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.017, -.06]}>
      <planeGeometry args={[2.65, 6.4]}/><meshBasicMaterial map={texture} transparent opacity={.88} depthWrite={false} toneMapped={false}/>
    </mesh>
    {[-.886, .886].flatMap(x => [-1.666, 1.638].map(z =>
      <mesh key={x + '/' + z} rotation={[-Math.PI / 2, 0, 0]} position={[x, -.015, z]}>
        <planeGeometry args={[.63, .82]}/><meshBasicMaterial map={texture} transparent opacity={.92} depthWrite={false} toneMapped={false}/>
      </mesh>
    ))}
  </>
}

function Stage() {
  const wings = useMemo(() => ({
    carbon: new MeshPhysicalMaterial({ color: '#22292c', roughness: .33, metalness: .51, clearcoat: .38, side: DoubleSide }),
    lime: new MeshPhysicalMaterial({ color: '#cbea30', roughness: .26, metalness: .37, clearcoat: .58, side: DoubleSide }),
  }), [])
  useEffect(() => () => { wings.carbon.dispose(); wings.lime.dispose() }, [wings])

  return <>
    <color attach="background" args={['#141917']}/>
    <fog attach="fog" args={['#141917', 11, 33]}/>
    <Environment resolution={64} frames={1}>
      <Lightformer intensity={2.5} position={[-3, 5.3, 2.6]} rotation={[Math.PI / 2.2, 0, -.38]} scale={[8, 2.4, 1]}/>
      <Lightformer intensity={1.7} position={[3.7, 3.7, -2.4]} rotation={[Math.PI / 2.1, 0, .52]} scale={[6.4, 1.65, 1]}/>
      <Lightformer intensity={1.2} color="#bfe6c3" position={[-3.9, 1.25, -.37]} rotation={[0, Math.PI / 2, 0]} scale={[7, 1, 1]}/>
    </Environment>
    <hemisphereLight args={['#dadeda', '#464c41', 1.15]}/>
    <directionalLight color="#ecefea" position={[4.3, 6.9, 4.2]} intensity={2.1}/>
    <directionalLight color="#cced8a" position={[-4.9, 3.7, -3.1]} intensity={.98}/>
    <directionalLight color="#bfd4db" position={[1.7, 2.8, -4.35]} intensity={.77}/>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.024, 0]}>
      <planeGeometry args={[60, 60]}/><meshStandardMaterial color="#202621" roughness={.91} metalness={.12} envMapIntensity={.25}/>
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.014, 0]}>
      <ringGeometry args={[3.06, 3.074, 90]}/><meshBasicMaterial color="#4a5742"/>
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.012, 0]}>
      <ringGeometry args={[3.15, 3.164, 38, 1, .08, .69]}/><meshBasicMaterial color="#859b4b"/>
    </mesh>
    <GroundShadows/>
    <CarModel wingCarbon={wings.carbon} wingLime={wings.lime}/>
  </>
}

export default function CarScene() {
  const reduced = Boolean(useReducedMotion())
  const [view, setView] = useState<View>('studio')
  const [revision, setRevision] = useState(0)
  const [active, setActive] = useState(true)
  const [rotate, setRotate] = useState(false)
  const spin = !reduced && rotate
  const choose = (next: View) => {
    setRotate(false)
    setActive(true)
    setView(next)
    setRevision(value => value + 1)
  }

  return <div className="car-studio">
    <div className="car-stage" role="region" aria-label="Interactive Formula car model">
      <Canvas camera={{ position: [4.9, 2.63, 6.25], fov: 36 }} dpr={[1, 1.5]}
        frameloop={spin ? 'always' : 'demand'} gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
        fallback={<p className="studio-unavailable">WebGL is unavailable on this device.</p>}>
        <Stage/>
        <StudioCamera view={view} revision={revision} spin={spin} reduced={reduced}
          onManual={() => { setActive(false); setRotate(false) }}/>
      </Canvas>
    </div>
    <div className="studio-controls">
      <div role="group" aria-label="Camera angle" className="studio-angles">
        <Focus size={16} aria-hidden/>
        {(Object.entries(views) as [View, (typeof views)[View]][]).map(([key, angle]) =>
          <button key={key} type="button" aria-pressed={active && view === key} onClick={() => choose(key)}>{angle.title}</button>)}
      </div>
      <small><Move size={13} aria-hidden/> Drag to orbit · Scroll or pinch to zoom</small>
      {!reduced && <button type="button" className="studio-rotate" aria-pressed={spin}
        onClick={() => { setActive(false); setRotate(value => !value) }}>
        <RotateCw size={15} aria-hidden/> Auto-rotate
      </button>}
    </div>
  </div>
}
