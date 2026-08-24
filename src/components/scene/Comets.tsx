import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { COMETS, type CometData } from '../../data/comets'
import { useSimulationClock } from './SimulationClock'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { EPOCH_YEAR } from '../../utils/orbital'

/**
 * Famous comets with dust + ion tails always pointing away from the Sun.
 */
function CometBody({ data }: { data: CometData }) {
  const group = useRef<THREE.Group>(null)
  const dustRef = useRef<THREE.Mesh>(null)
  const ionRef = useRef<THREE.Mesh>(null)
  const { animDays } = useSimulationClock()
  const year = useSimulatorStore((s) => s.simulationYear)

  const a = (data.perihelion + data.aphelion) / 2
  const e = (data.aphelion - data.perihelion) / (data.aphelion + data.perihelion)
  const periodDays = data.periodYears * 365.25

  useFrame(() => {
    if (!group.current) return
    const days = (year - EPOCH_YEAR) * 365.25 + animDays.current
    const mean = ((days / periodDays) * Math.PI * 2 + data.phase) % (Math.PI * 2)
    // Approximate true anomaly from mean (first-order)
    const nu = mean + 2 * e * Math.sin(mean)
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu))
    const inc = (data.inclination * Math.PI) / 180
    const x = Math.cos(nu) * r
    const z = Math.sin(nu) * r
    const y = Math.sin(nu) * Math.sin(inc) * r * 0.35
    group.current.position.set(x, y, z)

    // Tail points away from Sun (origin)
    const away = new THREE.Vector3(x, y, z).normalize()
    if (dustRef.current) {
      dustRef.current.position.copy(away.clone().multiplyScalar(data.tailLength * 0.35))
      dustRef.current.lookAt(0, 0, 0)
      dustRef.current.rotateX(Math.PI / 2)
      const scale = data.tailLength * (0.6 + 0.4 * (1 - r / data.aphelion))
      dustRef.current.scale.set(0.35, scale, 0.35)
    }
    if (ionRef.current) {
      ionRef.current.position.copy(away.clone().multiplyScalar(data.tailLength * 0.45))
      ionRef.current.lookAt(0, 0, 0)
      ionRef.current.rotateX(Math.PI / 2)
      const scale = data.tailLength * 1.15 * (0.5 + 0.5 * (1 - r / data.aphelion))
      ionRef.current.scale.set(0.12, scale, 0.12)
    }
  })

  return (
    <group ref={group}>
      {/* Nucleus */}
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color="#d0d4dc"
          roughness={0.85}
          emissive={data.color}
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Coma */}
      <mesh scale={2.2}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Dust tail (curved feel via wide cone) */}
      <mesh ref={dustRef}>
        <coneGeometry args={[1, 1, 8, 1, true]} />
        <meshBasicMaterial
          color="#c8b898"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Ion tail (narrow, bluish, anti-sun) */}
      <mesh ref={ionRef}>
        <coneGeometry args={[1, 1, 6, 1, true]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export function Comets() {
  return (
    <group>
      {COMETS.map((c) => (
        <CometBody key={c.id} data={c} />
      ))}
    </group>
  )
}
