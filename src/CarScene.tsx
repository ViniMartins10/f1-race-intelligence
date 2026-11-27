import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Float, OrbitControls } from '@react-three/drei'
import { useReducedMotion } from 'motion/react'
import { useRef } from 'react'
import type { Group } from 'three'

function Car({ motion }: { motion: boolean }) {
  const group = useRef<Group>(null)
  useFrame(({ pointer }, delta) => {
    if (group.current && motion) {
      group.current.rotation.y += (pointer.x * 0.24 - group.current.rotation.y) * Math.min(1, delta * 4)
      group.current.rotation.z += (-pointer.y * 0.1 - group.current.rotation.z) * Math.min(1, delta * 4)
    }
  })
  return <group ref={group}>
    <mesh position={[0, .46, -.05]} scale={[.59, .67, 2.05]} castShadow><sphereGeometry args={[1, 24, 16]}/><meshStandardMaterial color="#23272a" metalness={.78} roughness={.3}/></mesh>
    <mesh position={[0, .46, 1.32]} rotation={[Math.PI / 2.13, 0, 0]} scale={[1, 1, 1.45]} castShadow><cylinderGeometry args={[.11, .36, 2.1, 12]}/><meshStandardMaterial color="#bedf2e" metalness={.68} roughness={.33}/></mesh>
    <mesh position={[0, .75, .12]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.6, .6]}><torusGeometry args={[.35, .055, 10, 30]}/><meshStandardMaterial color="#d5f940" metalness={.5}/></mesh>
    <mesh position={[0, .83, -.16]} castShadow><sphereGeometry args={[.27, 20, 14]}/><meshStandardMaterial color="#141616" metalness={.5}/></mesh>
    {[-1, 1].map(side => <group key={side}>
      {[-1.55, 1.56].map(z => <group key={z} position={[side * 1.02, .48, z]} rotation={[0, 0, Math.PI / 2]}>
        <mesh castShadow><cylinderGeometry args={[.48, .48, z < 0 ? .51 : .37, 30]}/><meshStandardMaterial color="#17191b" roughness={.56}/></mesh>
        <mesh position={[0, side * -.22, 0]}><cylinderGeometry args={[.29, .29, .06, 16]}/><meshStandardMaterial color="#45484d" metalness={.8}/></mesh>
      </group>)}
      <mesh position={[side * .55, .4, -.55]} scale={[.43, .24, 1.25]} castShadow><sphereGeometry args={[1, 16, 12]}/><meshStandardMaterial color="#313736" metalness={.75} roughness={.22}/></mesh>
      <mesh position={[side * .88, .88, -1.94]}><boxGeometry args={[.085, .61, .66]}/><meshStandardMaterial color="#d5f940"/></mesh>
    </group>)}
    <mesh position={[0, .19, 2.12]} rotation={[.07, 0, 0]} castShadow><boxGeometry args={[2.28, .08, .61]}/><meshStandardMaterial color="#35383b" metalness={.7}/></mesh>
    <mesh position={[0, .97, -1.94]} castShadow><boxGeometry args={[1.9, .1, .55]}/><meshStandardMaterial color="#292d2f" metalness={.75}/></mesh>
  </group>
}
export default function CarScene() {
  const reduced = useReducedMotion()
  return <Canvas camera={{ position: [4.8, 2.55, 5.8], fov: 43 }} dpr={[1, 1.5]} fallback={<p>3D view requires WebGL. The rendered car is available on the overview.</p>}>
    <color attach="background" args={['#0d110e']}/>
    <ambientLight intensity={.65}/><directionalLight intensity={3} position={[3, 6, 4]}/>
    <pointLight position={[-3, 2, -4]} color="#c7ff39" intensity={65}/>
    <Float speed={reduced ? 0 : .8} floatIntensity={.1} rotationIntensity={0}><Car motion={!reduced}/></Float>
    <ContactShadows position={[0, -.08, 0]} opacity={.6} scale={9} blur={2.5} far={4}/>
    <OrbitControls enablePan={false} minDistance={3.6} maxDistance={12} maxPolarAngle={Math.PI / 2.1}/>
  </Canvas>
}
