import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { MISSIONS } from '../../data/missions'
import { PLANETS_BY_ID } from '../../data/planets'
import { getBodyWorldPosition } from '../../utils/orbital'
import { useSimulationClock } from './SimulationClock'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { useExplorationStore } from '../../store/useExplorationStore'
import { sfxEngine } from '../../audio/sfxEngine'

/**
 * Lightweight mission markers orbiting parent bodies.
 * Does not alter planet meshes or materials.
 */
function MissionMarker({
  id,
  parentBodyId,
  localOrbit,
  color,
}: {
  id: string
  parentBodyId: string
  localOrbit: number
  color: string
}) {
  const ref = useRef<THREE.Group>(null)
  const { animDays } = useSimulationClock()
  const year = useSimulatorStore((s) => s.simulationYear)
  const setSelectedDiscoveryId = useExplorationStore((s) => s.setSelectedDiscoveryId)
  const markBodyDblClick = useSimulatorStore((s) => s.markBodyDblClick)
  const pointerDragging = useSimulatorStore((s) => s.pointerDragging)
  const phase = useMemo(() => Math.random() * Math.PI * 2, [])

  useFrame(() => {
    if (!ref.current) return
    const parent = PLANETS_BY_ID[parentBodyId]
    if (!parent) return
    const [px, py, pz] = getBodyWorldPosition(parent, PLANETS_BY_ID, year, animDays.current)
    // Local orbital angle — faster near planets
    const period = 0.4 + localOrbit * 0.15
    const a = phase + (animDays.current / period) * 0.15
    const lx = Math.cos(a) * localOrbit
    const lz = Math.sin(a) * localOrbit
    const ly = Math.sin(a * 1.3) * localOrbit * 0.12
    ref.current.position.set(px + lx, py + ly, pz + lz)
    ref.current.rotation.y += 0.01
  })

  return (
    <group
      ref={ref}
      onDoubleClick={(e) => {
        e.stopPropagation()
        markBodyDblClick()
        if (pointerDragging) return
        void sfxEngine.playSelect()
        setSelectedDiscoveryId(id)
      }}
      onPointerOver={() => {
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'default'
      }}
    >
      {/* Compact craft silhouette */}
      <mesh>
        <boxGeometry args={[0.12, 0.06, 0.2]} />
        <meshStandardMaterial color={color} roughness={0.45} metalness={0.55} />
      </mesh>
      <mesh position={[0.14, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshStandardMaterial color="#8899aa" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh position={[-0.14, 0, 0]}>
        <boxGeometry args={[0.08, 0.02, 0.12]} />
        <meshStandardMaterial color="#8899aa" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Soft beacon */}
      <mesh scale={1.8}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export function Satellites() {
  return (
    <group>
      {MISSIONS.filter((m) => m.parentBodyId && m.localOrbit).map((m) => (
        <MissionMarker
          key={m.id}
          id={m.id}
          parentBodyId={m.parentBodyId!}
          localOrbit={m.localOrbit!}
          color={m.color}
        />
      ))}
    </group>
  )
}
