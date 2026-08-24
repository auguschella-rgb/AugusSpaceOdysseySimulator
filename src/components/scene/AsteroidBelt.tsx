import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  buildAsteroidLibrary,
  asteroidColor,
  asteroidRoughness,
  asteroidMetalness,
} from '../../utils/asteroidGeometry'

const LIBRARY_SIZE = 128
/** Instances per unique mesh (total ≈ LIBRARY_SIZE * PER_MESH) */
const PER_MESH = 28
const TOTAL = LIBRARY_SIZE * PER_MESH // ~3584

type InstanceData = {
  pos: THREE.Vector3
  scale: number
  rot: THREE.Euler
  spin: THREE.Vector3
  color: THREE.Color
}

/**
 * Natural main-belt + scattered debris using unique irregular meshes.
 * GPU instancing per prototype geometry.
 */
export function AsteroidBelt() {
  const groupRef = useRef<THREE.Group>(null)
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorDummy = useMemo(() => new THREE.Color(), [])

  const library = useMemo(() => buildAsteroidLibrary(LIBRARY_SIZE, 'mid'), [])
  // Low LOD library for distant scatter (cheaper)
  const libraryLow = useMemo(() => buildAsteroidLibrary(32, 'low'), [])

  const { beltData, scatterData } = useMemo(() => {
    const beltData: InstanceData[][] = Array.from({ length: LIBRARY_SIZE }, () => [])
    const scatterData: InstanceData[][] = Array.from({ length: 32 }, () => [])

    // Main belt between Mars (~24) and Jupiter (~36) visual orbits
    for (let m = 0; m < LIBRARY_SIZE; m++) {
      for (let i = 0; i < PER_MESH; i++) {
        const seed = m * 1000 + i
        const a = Math.random() * Math.PI * 2
        // Power-law radial density, slight eccentricity
        const r = 26 + Math.pow(Math.random(), 0.7) * 11 + (Math.random() - 0.5) * 1.5
        // Realistic inclination (degrees-ish → visual height)
        const incl = (Math.random() - 0.5) * 0.12 + (Math.random() - 0.5) * 0.04
        const y = Math.sin(a * 0.3 + seed) * r * incl * 2.2

        // Size distribution: many tiny, few large
        const sizeRoll = Math.random()
        let scale: number
        if (sizeRoll < 0.55) scale = 0.012 + Math.random() * 0.025 // tiny debris
        else if (sizeRoll < 0.85) scale = 0.035 + Math.random() * 0.05 // small
        else if (sizeRoll < 0.97) scale = 0.08 + Math.random() * 0.07 // medium
        else scale = 0.15 + Math.random() * 0.12 // large boulder

        beltData[m].push({
          pos: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          scale,
          rot: new THREE.Euler(
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2,
            Math.random() * Math.PI * 2
          ),
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.08,
            (Math.random() - 0.5) * 0.08
          ),
          color: asteroidColor(seed * 0.17),
        })
      }
    }

    // Sparse deep-space debris (no belt pattern)
    for (let m = 0; m < 32; m++) {
      for (let i = 0; i < 20; i++) {
        const seed = 50000 + m * 200 + i
        const a = Math.random() * Math.PI * 2
        const r = 40 + Math.random() * 55
        const y = (Math.random() - 0.5) * 18
        scatterData[m].push({
          pos: new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r),
          scale: 0.015 + Math.random() * 0.06,
          rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          spin: new THREE.Vector3(
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05,
            (Math.random() - 0.5) * 0.05
          ),
          color: asteroidColor(seed * 0.31),
        })
      }
    }

    return { beltData, scatterData }
  }, [])

  // Materials per mesh with varied roughness (shared material + instance colors)
  const materials = useMemo(() => {
    return Array.from({ length: LIBRARY_SIZE }, (_, m) => {
      const seed = m * 13.7
      return new THREE.MeshStandardMaterial({
        color: '#888888',
        roughness: asteroidRoughness(seed),
        metalness: asteroidMetalness(seed),
        flatShading: true,
        envMapIntensity: 0.15,
      })
    })
  }, [])

  const scatterMaterials = useMemo(() => {
    return Array.from({ length: 32 }, (_, m) => {
      const seed = m * 29.1
      return new THREE.MeshStandardMaterial({
        color: '#888888',
        roughness: asteroidRoughness(seed),
        metalness: asteroidMetalness(seed),
        flatShading: true,
      })
    })
  }, [])

  useFrame((_, delta) => {
    // Very slow bulk orbital drift
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.0018
    }

    const update = (
      mesh: THREE.InstancedMesh | null,
      data: InstanceData[]
    ) => {
      if (!mesh || data.length === 0) return
      for (let i = 0; i < data.length; i++) {
        const d = data[i]
        d.rot.x += d.spin.x * delta
        d.rot.y += d.spin.y * delta
        d.rot.z += d.spin.z * delta
        dummy.position.copy(d.pos)
        dummy.rotation.copy(d.rot)
        dummy.scale.setScalar(d.scale)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
        colorDummy.copy(d.color)
        mesh.setColorAt(i, colorDummy)
      }
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }

    for (let m = 0; m < LIBRARY_SIZE; m++) {
      update(meshRefs.current[m], beltData[m])
    }
    for (let m = 0; m < 32; m++) {
      update(meshRefs.current[LIBRARY_SIZE + m], scatterData[m])
    }
  })

  return (
    <group ref={groupRef}>
      {library.map((geo, m) => (
        <instancedMesh
          key={`belt-${m}`}
          ref={(el) => {
            meshRefs.current[m] = el
          }}
          args={[geo, materials[m], PER_MESH]}
          frustumCulled
          castShadow={false}
          receiveShadow={false}
        />
      ))}
      {libraryLow.map((geo, m) => (
        <instancedMesh
          key={`scatter-${m}`}
          ref={(el) => {
            meshRefs.current[LIBRARY_SIZE + m] = el
          }}
          args={[geo, scatterMaterials[m], 20]}
          frustumCulled
        />
      ))}
    </group>
  )
}

// silence unused
void TOTAL
