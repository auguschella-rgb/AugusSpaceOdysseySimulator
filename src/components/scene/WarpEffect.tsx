import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExplorationStore } from '../../store/useExplorationStore'

/**
 * Additive star-stretch streaks during warp — does not modify StarField shaders.
 */
export function WarpEffect() {
  const ref = useRef<THREE.Points>(null)
  const isWarping = useExplorationStore((s) => s.isWarping)
  const warpLevel = useExplorationStore((s) => s.warpLevel)
  const travelPhase = useExplorationStore((s) => s.travelPhase)
  const { camera } = useThree()

  const count = 400
  const { positions, speeds } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80
      speeds[i] = 20 + Math.random() * 60
    }
    return { positions, speeds }
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const warping =
      warpLevel > 0 &&
      (isWarping ||
        travelPhase === 'planning' ||
        travelPhase === 'accelerating' ||
        travelPhase === 'cruising' ||
        travelPhase === 'approaching')
    ref.current.visible = warping
    if (!warping) return

    ref.current.position.copy(camera.position)
    const arr = ref.current.geometry.attributes.position.array as Float32Array
    const mul = 0.4 + (warpLevel === 100 ? 12 : warpLevel) * 0.08
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)

    for (let i = 0; i < count; i++) {
      // Streak opposite travel (stars stretch past)
      arr[i * 3] -= forward.x * speeds[i] * delta * mul * 0.15
      arr[i * 3 + 1] -= forward.y * speeds[i] * delta * mul * 0.15
      arr[i * 3 + 2] -= forward.z * speeds[i] * delta * mul * 0.15
      // Recycle when far
      const dx = arr[i * 3]
      const dy = arr[i * 3 + 1]
      const dz = arr[i * 3 + 2]
      if (dx * dx + dy * dy + dz * dz > 90 * 90) {
        arr[i * 3] = (Math.random() - 0.5) * 40
        arr[i * 3 + 1] = (Math.random() - 0.5) * 30
        arr[i * 3 + 2] = (Math.random() - 0.5) * 40
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true
    const mat = ref.current.material as THREE.PointsMaterial
    mat.opacity = Math.min(0.55, 0.15 + warpLevel * 0.04)
    mat.size = 0.08 + Math.min(warpLevel, 10) * 0.02
  })

  return (
    <points ref={ref} frustumCulled={false} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#c8d8ff"
        size={0.15}
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}
