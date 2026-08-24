import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Documentary lens ghost — only when looking almost directly at the Sun.
 * Intensity ~10% of original exaggerated flare. No giant orange discs.
 */
export function LensFlare() {
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const sun = useRef(new THREE.Vector3(0, 0, 0))
  const projected = useRef(new THREE.Vector3())
  const camDir = useRef(new THREE.Vector3())
  const toSun = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!group.current) return
    projected.current.copy(sun.current).project(camera)

    camera.getWorldDirection(camDir.current)
    toSun.current.copy(sun.current).sub(camera.position).normalize()
    const align = Math.max(0, camDir.current.dot(toSun.current))

    // Only when nearly looking into the sun (align ~0.97+)
    const facing = Math.pow(Math.max(0, align - 0.96) / 0.04, 2)
    const onScreen =
      projected.current.z < 1 &&
      Math.abs(projected.current.x) < 0.85 &&
      Math.abs(projected.current.y) < 0.85

    // 90% reduction: very faint ghosts
    const intensity = onScreen ? facing * 0.035 : 0

    group.current.visible = intensity > 0.004
    if (!group.current.visible) return

    const sx = (projected.current.x * 0.5 + 0.5) * size.width
    const sy = (-projected.current.y * 0.5 + 0.5) * size.height
    const cx = size.width / 2
    const cy = size.height / 2

    group.current.children.forEach((child, i) => {
      const t = 0.35 + i * 0.28
      const x = THREE.MathUtils.lerp(sx, cx * 2 - sx, t)
      const y = THREE.MathUtils.lerp(sy, cy * 2 - sy, t)
      const ndcX = (x / size.width) * 2 - 1
      const ndcY = -(y / size.height) * 2 + 1
      child.position.copy(new THREE.Vector3(ndcX, ndcY, 0.6).unproject(camera))
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial
      if (mat) mat.opacity = intensity * (0.55 - i * 0.15)
      child.scale.setScalar(0.12 + i * 0.06)
    })
  })

  return (
    <group ref={group}>
      {[0, 1].map((i) => (
        <mesh key={i} renderOrder={10}>
          <circleGeometry args={[0.2, 16]} />
          <meshBasicMaterial
            color={i === 0 ? '#e8d8c0' : '#a8b8d0'}
            transparent
            opacity={0}
            depthWrite={false}
            depthTest={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
