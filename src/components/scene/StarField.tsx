import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DeepSpace } from './DeepSpace'
import { getMilkyWayTexture } from '../../utils/nasaTextureLoader'
import { useTextureStore } from '../../store/useTextureStore'

/**
 * Scientific Milky Way: equirectangular panorama + dark dust lanes + soft haze.
 * No colorful fantasy nebulae.
 */
function MilkyWayBand() {
  const group = useRef<THREE.Group>(null)
  const texRevision = useTextureStore((s) => s.revision)

  const fallback = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1536
    canvas.height = 384
    const ctx = canvas.getContext('2d')!
    // Cool grey galactic band
    const grad = ctx.createLinearGradient(0, 0, 0, 384)
    grad.addColorStop(0, 'rgba(0,0,0,0)')
    grad.addColorStop(0.32, 'rgba(40,42,55,0.2)')
    grad.addColorStop(0.5, 'rgba(90,88,100,0.38)')
    grad.addColorStop(0.68, 'rgba(40,42,55,0.2)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, 1536, 384)
    // Star dust
    for (let i = 0; i < 800; i++) {
      ctx.fillStyle = `rgba(220,225,235,${0.05 + Math.random() * 0.35})`
      ctx.fillRect(Math.random() * 1536, 80 + Math.random() * 220, 1, 1)
    }
    // Dark dust lanes
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1536
      const y = 140 + Math.random() * 100
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + Math.random() * 60)
      g.addColorStop(0, 'rgba(0,0,0,0.45)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 80, y - 40, 160, 80)
    }
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [])

  const dustLaneTex = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 1024, 256)
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * 1024
      const y = 90 + Math.random() * 80
      const rx = 80 + Math.random() * 120
      const ry = 12 + Math.random() * 25
      const g = ctx.createRadialGradient(x, y, 0, x, y, rx)
      g.addColorStop(0, 'rgba(0,0,0,0.55)')
      g.addColorStop(0.5, 'rgba(0,0,0,0.2)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.ellipse(x, y, rx, ry, (Math.random() - 0.5) * 0.4, 0, Math.PI * 2)
      ctx.fill()
    }
    // Faint cool nebula wisps (desaturated)
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * 1024
      const y = 100 + Math.random() * 60
      const g = ctx.createRadialGradient(x, y, 0, x, y, 50 + Math.random() * 40)
      g.addColorStop(0, 'rgba(90,95,110,0.12)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x - 60, y - 40, 120, 80)
    }
    const tex = new THREE.CanvasTexture(canvas)
    return tex
  }, [])

  const texture = useMemo(() => getMilkyWayTexture() ?? fallback, [texRevision, fallback])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0004
  })

  return (
    <group ref={group} rotation={[0.38, 0, 0.08]}>
      {/* Main scientific panorama */}
      <mesh frustumCulled={false} scale={[1, 0.42, 1]}>
        <sphereGeometry args={[220, 64, 32]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={0.5}
          side={THREE.BackSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Soft galactic haze shell */}
      <mesh frustumCulled={false} scale={[1, 0.35, 1]}>
        <sphereGeometry args={[218, 32, 16]} />
        <meshBasicMaterial
          color="#1a1c28"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Dark molecular dust lanes overlay */}
      <mesh frustumCulled={false} scale={[1, 0.38, 1]}>
        <sphereGeometry args={[216, 48, 24]} />
        <meshBasicMaterial
          map={dustLaneTex}
          transparent
          opacity={0.55}
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function ShootingStars() {
  const meshes = useRef<(THREE.Mesh | null)[]>([null, null, null])
  const meteors = useRef(
    Array.from({ length: 3 }, () => ({
      active: false,
      t: 0,
      duration: 1,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      cooldown: Math.random() * 10,
    }))
  )

  useFrame((_, delta) => {
    meteors.current.forEach((m, idx) => {
      m.cooldown -= delta
      if (!m.active && m.cooldown <= 0) {
        m.active = true
        m.t = 0
        m.duration = 0.8 + Math.random() * 0.7
        const r = 40 + Math.random() * 30
        m.start.set((Math.random() - 0.5) * r, 15 + Math.random() * 25, (Math.random() - 0.5) * r)
        m.end.copy(m.start).add(
          new THREE.Vector3(-16 - Math.random() * 18, -8 - Math.random() * 10, (Math.random() - 0.5) * 10)
        )
        m.cooldown = 8 + Math.random() * 18
      }
      const mesh = meshes.current[idx]
      if (m.active && mesh) {
        m.t += delta / m.duration
        const p = Math.min(1, m.t)
        const head = new THREE.Vector3().lerpVectors(m.start, m.end, p)
        const mid = new THREE.Vector3().lerpVectors(m.start, m.end, Math.max(0, p - 0.1))
        mesh.position.copy(mid)
        mesh.lookAt(head)
        mesh.scale.set(0.025, 0.025, head.distanceTo(mid) + 0.01)
        ;(mesh.material as THREE.MeshBasicMaterial).opacity =
          p < 1 ? Math.sin(p * Math.PI) * 0.45 : 0
        if (m.t >= 1) m.active = false
      } else if (mesh) {
        ;(mesh.material as THREE.MeshBasicMaterial).opacity = 0
      }
    })
  })

  return (
    <group>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(el) => {
            meshes.current[i] = el
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial
            color="#d8e4f8"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export function StarField() {
  return (
    <group>
      <MilkyWayBand />
      <ShootingStars />
      <DeepSpace />
    </group>
  )
}
