import { useEffect, useMemo } from 'react'
import {
  BufferGeometry, CatmullRomCurve3, Color, DoubleSide, ExtrudeGeometry, Float32BufferAttribute,
  Shape, Vector2, Vector3,
} from 'three'
import type { BufferGeometry as Geometry, Material } from 'three'

const carbon = '#191f22'
const paint = '#303c40'
const lime = '#c5ef29'
const silver = '#647075'
type Point = [number, number, number]
type Section = [station: number, centerX: number, centerY: number, width: number, height: number]
type Livery = (station: number, angle: number) => string

function interpolate(a: number, b: number, c: number, d: number, t: number) {
  const s = t * t
  return .5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * s + (-a + 3 * b - 3 * c + d) * s * t)
}

function bodyGeometry(sections: Section[], livery: Livery) {
  const segments = 48
  const radial = 40
  const points: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const color = new Color()
  for (let row = 0; row <= segments; row++) {
    const path = row / segments * (sections.length - 1)
    const index = Math.min(Math.floor(path), sections.length - 2)
    const before = sections[Math.max(0, index - 1)]
    const start = sections[index]
    const end = sections[index + 1]
    const after = sections[Math.min(sections.length - 1, index + 2)]
    const blend = path - index
    const value = (axis: 1 | 2 | 3 | 4) => interpolate(before[axis], start[axis], end[axis], after[axis], blend)
    const station = start[0] + (end[0] - start[0]) * blend
    for (let column = 0; column < radial; column++) {
      const angle = column / radial * Math.PI * 2
      const x = Math.cos(angle)
      const y = Math.sin(angle)
      points.push(value(1) + x * Math.max(.001, value(3)), value(2) + y * Math.max(.001, value(4)), station)
      color.set(livery(station, angle))
      colors.push(color.r, color.g, color.b)
      if (row === segments) continue
      const a = row * radial + column
      const b = row * radial + (column + 1) % radial
      indices.push(a, b, a + radial, b, b + radial, a + radial)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const nose: Section[] = [
  [-.64, 0, .442, .19, .10], [-.38, 0, .418, .31, .118], [.10, 0, .411, .318, .118],
  [.42, 0, .446, .304, .174], [.70, 0, .445, .265, .167], [1.16, 0, .438, .19, .13],
  [1.62, 0, .388, .135, .115], [2.02, 0, .319, .107, .09], [2.43, 0, .211, .096, .069],
  [2.60, 0, .177, .078, .033], [2.665, 0, .168, .001, .001],
]
const engine: Section[] = [
  [-2.46, 0, .348, .03, .04], [-2.03, 0, .393, .128, .143], [-1.62, 0, .433, .197, .235],
  [-1.17, 0, .476, .288, .32], [-.82, 0, .484, .298, .29], [-.55, 0, .437, .238, .14],
  [-.42, 0, .417, .02, .023],
]
const sidepod: Section[] = [
  [-1.73, .296, .20, .025, .025], [-1.45, .38, .262, .126, .095], [-1.03, .45, .327, .226, .124],
  [-.6, .47, .38, .255, .155], [-.18, .464, .429, .228, .157], [.14, .434, .432, .168, .12],
  [.27, .423, .401, .12, .087], [.40, .408, .352, .015, .019],
]
const nosePaint: Livery = (station, angle) => {
  const top = Math.sin(angle) > .3
  const panel = Math.cos(angle)
  const center = (station - 1.57) * .72
  if (top && station > .56 && Math.abs(panel - center) < .38) return lime
  return top ? paint : carbon
}
const sidePaint: Livery = (station, angle) => {
  const upper = Math.sin(angle)
  const outer = Math.cos(angle)
  if (station > -.92 && upper > .36 && outer > .05 && outer < .52 + station * .31) return lime
  return upper > -.3 ? paint : carbon
}
const enginePaint: Livery = (station, angle) =>
  Math.sin(angle) > .87 && station > -1.78 ? lime : Math.sin(angle) > .02 ? paint : carbon

function panelGeometry(points: [number, number][], depth: number, bevel: number) {
  const shape = new Shape(points.map(([x, y]) => new Vector2(x, y)))
  return new ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, steps: 1,
  })
}

function wingGeometry(span: number, chord: number, drop: number, sweep: number) {
  const geometry = new BufferGeometry()
  const points: number[] = []
  const indices: number[] = []
  const segments = 24
  const profile = [[0, 0], [.11, .017], [.34, .023], [.69, .018], [1, -.014]]
  for (let i = 0; i <= segments; i++) {
    const s = i / segments * 2 - 1
    for (let p = 0; p < profile.length; p++) {
      const [distance, height] = profile[p]
      points.push(s * span, height + Math.abs(s) ** 2.8 * drop, (distance - .5) * chord + sweep * s ** 2)
      if (i === segments || p === profile.length - 1) continue
      const a = i * profile.length + p
      const b = a + profile.length
      indices.push(a, b + 1, b, a, a + 1, b + 1)
    }
  }
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function Linkage({ from, to, radius = .014, color = '#32383a' }: { from: Point; to: Point; radius?: number; color?: string }) {
  const start = new Vector3(...from)
  const end = new Vector3(...to)
  const direction = end.clone().sub(start)
  const orientation = new Vector3(0, 1, 0)
  return <mesh position={start.addScaledVector(direction, .5)} onUpdate={object => object.quaternion.setFromUnitVectors(orientation, direction.clone().normalize())}>
    <cylinderGeometry args={[radius, radius, direction.length(), 8]}/><meshStandardMaterial color={color} metalness={.65} roughness={.37}/>
  </mesh>
}

const tireProfile: [number, number][] = [[.225,-.97],[.294,-1],[.326,-.87],[.351,-.64],[.36,-.34],[.361,.42],[.35,.69],[.326,.9],[.292,1],[.225,.97],[.225,-.97]]
function Wheel({ side, z, rear = false }: { side: number; z: number; rear?: boolean }) {
  const halfWidth = rear ? .209 : .161
  const radius = rear ? 1.04 : 1
  const profile = useMemo(() => tireProfile.map(([r, width]) => new Vector2(r * radius, width * halfWidth)), [halfWidth, radius])
  return <group position={[side * .886, .361 * radius, z]} rotation={[0, 0, -side * Math.PI / 2]}>
    <mesh castShadow><latheGeometry args={[profile, 54]}/><meshStandardMaterial color="#222627" roughness={.88}/></mesh>
    <mesh position={[0, halfWidth * .88, 0]}><cylinderGeometry args={[.228, .228, .056, 40]}/><meshStandardMaterial color="#101514" metalness={.46} roughness={.44}/></mesh>
    <mesh position={[0, halfWidth * 1.043, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.229, .009, 8, 48]}/><meshStandardMaterial color="#3e4446" metalness={.72} roughness={.28}/>
    </mesh>
    <mesh position={[0, halfWidth * 1.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[.292 * radius, .0028, 5, 48]}/><meshStandardMaterial color="#c5c6a1" roughness={.85}/>
    </mesh>
    {Array.from({ length: 9 }, (_, index) => {
      const angle = index / 9 * Math.PI * 2
      return <mesh key={index} position={[Math.cos(angle) * .142, halfWidth + .013, Math.sin(angle) * .142]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[.121, .015, .025]}/><meshStandardMaterial color={silver} metalness={.8} roughness={.37}/>
      </mesh>
    })}
    <mesh position={[0, halfWidth + .034, 0]}><cylinderGeometry args={[.06,.064,.05,8]}/><meshStandardMaterial color="#a4a69b" metalness={.75} roughness={.29}/></mesh>
  </group>
}

const floorHalf: [number, number][] = [[0,2.43],[.24,2.22],[.28,1.13],[.5,.61],[.78,.43],[.83,.13],[.82,-.75],[.67,-1.13],[.54,-1.45],[.49,-2.35],[0,-2.43]]
const frontPlate: [number, number][] = [[2.25,-.055],[2.31,.042],[2.57,.080],[2.79,.057],[2.826,.014],[2.77,-.045]]
const rearPlate: [number, number][] = [[-2.72,.756],[-2.39,.797],[-2.194,.934],[-2.254,1.105],[-2.58,1.109],[-2.728,1.066]]
const halo = [
  [-.224,.687,-.59],[-.2,.781,-.39],[-.185,.827,-.13],[-.094,.842,.106],[0,.816,.195],
  [.094,.842,.106],[.185,.827,-.13],[.2,.781,-.39],[.224,.687,-.59],
] as Point[]

function CoatedBody({ geometry }: { geometry: Geometry }) {
  return <mesh geometry={geometry} castShadow receiveShadow>
    <meshPhysicalMaterial vertexColors metalness={.43} roughness={.265} clearcoat={.62} clearcoatRoughness={.24}/>
  </mesh>
}
function Wing({ geometry, material, position }: { geometry: Geometry; material: Material; position: Point }) {
  return <mesh geometry={geometry} material={material} position={position} castShadow receiveShadow/>
}

export default function CarModel({ wingCarbon, wingLime }: { wingCarbon: Material; wingLime: Material }) {
  const haloCurve = useMemo(() => new CatmullRomCurve3(halo.map(point => new Vector3(...point))), [])
  const shape = useMemo(() => ({
    nose: bodyGeometry(nose, nosePaint),
    engine: bodyGeometry(engine, enginePaint),
    pods: bodyGeometry(sidepod, sidePaint),
    floor: panelGeometry([...floorHalf, ...floorHalf.slice(1, -1).reverse().map(([x, z]): [number, number] => [-x, z])], .03, .012),
    frontEnd: panelGeometry(frontPlate, .019, .009),
    rearEnd: panelGeometry(rearPlate, .022, .012),
    front: wingGeometry(1.065, .41, .035, -.105),
    frontFlap: wingGeometry(1.045, .235, .03, -.078),
    frontTrim: wingGeometry(1.050, .065, .03, -.078),
    rear: wingGeometry(.79, .372, .02, .05),
    rearFlap: wingGeometry(.79, .206, .02, .05),
    beam: wingGeometry(.59, .26, .022, .06),
  }), [])
  useEffect(() => () => { Object.values(shape).forEach(geometry => geometry.dispose()) }, [shape])

  return <group>
    <CoatedBody geometry={shape.nose}/>
    <CoatedBody geometry={shape.engine}/>
    <mesh geometry={shape.floor} position={[0,.108,0]} rotation={[Math.PI / 2,0,0]} castShadow receiveShadow>
      <meshStandardMaterial color="#272b2d" roughness={.48} metalness={.4}/>
    </mesh>
    <Wing geometry={shape.front} material={wingCarbon} position={[0,.129,2.63]}/>
    <Wing geometry={shape.frontFlap} material={wingCarbon} position={[0,.18,2.399]}/>
    <Wing geometry={shape.frontTrim} material={wingLime} position={[0,.185,2.31]}/>
    <Wing geometry={shape.rear} material={wingCarbon} position={[0,1.002,-2.468]}/>
    <Wing geometry={shape.rearFlap} material={wingLime} position={[0,1.069,-2.6]}/>
    <Wing geometry={shape.beam} material={wingCarbon} position={[0,.37,-2.24]}/>
    <mesh position={[0,.52,-.19]} scale={[.21,.086,.43]}><sphereGeometry args={[1,28,16]}/><meshStandardMaterial color="#080b0b" roughness={.8}/></mesh>
    <mesh position={[0,.661,-.246]} scale={[.151,.162,.146]} castShadow><sphereGeometry args={[1,28,20]}/><meshPhysicalMaterial color="#d5ea35" clearcoat={.78} roughness={.24}/></mesh>
    <mesh position={[0,.66,-.132]} scale={[.142,.061,.054]}><sphereGeometry args={[1,24,12]}/><meshPhysicalMaterial color="#161d26" metalness={.78} clearcoat={1} roughness={.19}/></mesh>
    <mesh><tubeGeometry args={[haloCurve,42,.031,10,false]}/><meshPhysicalMaterial color="#2a3335" metalness={.56} clearcoat={.48} roughness={.25}/></mesh>
    <Linkage from={[0,.559,.34]} to={[0,.816,.195]} radius={.026}/>
    <mesh position={[0,.805,-.75]} scale={[.169,.152,.218]}><sphereGeometry args={[1,28,16]}/><meshPhysicalMaterial color={paint} metalness={.46} roughness={.28} clearcoat={.6}/></mesh>
    <mesh position={[0,.824,-.601]} scale={[.097,.061,.049]}><sphereGeometry args={[1,24,12]}/><meshStandardMaterial color="#090d0d" roughness={.72}/></mesh>
    <mesh position={[0,.21,-2.49]} scale={[.068,.029,.033]}><sphereGeometry args={[1,14,10]}/><meshStandardMaterial color="#e24234" emissive="#b60804" emissiveIntensity={.8}/></mesh>

    {[-1,1].map(side => <group key={side}>
      <group scale={[side,1,1]}>
        <CoatedBody geometry={shape.pods}/>
        <mesh position={[.448,.464,.245]} scale={[.141,.060,.045]} rotation={[-.27,-.12,.115]}><sphereGeometry args={[1,28,14]}/><meshStandardMaterial color="#0a1010" roughness={.73} side={DoubleSide}/></mesh>
        <Linkage from={[.29,.588,.41]} to={[.57,.657,.36]} radius={.014}/>
        <mesh position={[.59,.665,.352]} scale={[.079,.033,.043]}><sphereGeometry args={[1,18,12]}/><meshStandardMaterial color={lime} metalness={.28} roughness={.31}/></mesh>
        <Linkage from={[.165,.35,-2.06]} to={[.183,1.006,-2.331]} radius={.025}/>
        <mesh geometry={shape.frontEnd} position={[1.06,.193,0]} rotation={[0,-Math.PI / 2,0]} castShadow><meshPhysicalMaterial color={paint} roughness={.28} metalness={.45} clearcoat={.5}/></mesh>
        <mesh geometry={shape.rearEnd} position={[.793,0,0]} rotation={[0,-Math.PI / 2,0]} castShadow><meshPhysicalMaterial color={lime} roughness={.3} metalness={.35} clearcoat={.6}/></mesh>
      </group>
      <Wheel side={side} z={1.638}/>
      <Wheel side={side} z={-1.666} rear/>
      {[1.638,-1.666].map(z => <group key={z}>
        <Linkage from={[side*.17,.30,z-.37]} to={[side*.734,.287,z]} radius={.016}/>
        <Linkage from={[side*.182,.301,z+.25]} to={[side*.739,.294,z]} radius={.016}/>
        <Linkage from={[side*.153,.453,z+.186]} to={[side*.746,.431,z]} radius={.012}/>
        <Linkage from={[side*.217,.363,z-.24]} to={[side*.749,.39,z+.045]} radius={.01} color="#4c5457"/>
      </group>)}
    </group>)}
  </group>
}
