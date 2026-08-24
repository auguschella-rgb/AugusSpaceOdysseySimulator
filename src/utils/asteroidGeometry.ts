/**
 * Mission Alpha 3.1 — irregular asteroid mesh library.
 * Procedural rubble inspired by Bennu / Ryugu / Itokawa / Eros / Vesta
 * (no cubes, pyramids, or obvious primitives).
 */
import * as THREE from 'three'

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function noise3(x: number, y: number, z: number, seed: number) {
  const n =
    hash(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 17.13) * 2 - 1
  const n2 =
    hash(x * 39.346 + y * 11.135 + z * 83.155 + seed * 91.7) * 2 - 1
  return (n + n2 * 0.5) / 1.5
}

function fbm3(x: number, y: number, z: number, seed: number, oct = 4) {
  let v = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < oct; i++) {
    v += a * noise3(x * f, y * f, z * f, seed + i * 19)
    a *= 0.5
    f *= 2.1
  }
  return v
}

export type AsteroidLod = 'high' | 'mid' | 'low'

/**
 * Build one unique irregular asteroid geometry.
 * seed controls silhouette; detail controls subdivision.
 */
export function createAsteroidGeometry(seed: number, lod: AsteroidLod = 'mid'): THREE.BufferGeometry {
  const detail = lod === 'high' ? 3 : lod === 'mid' ? 2 : 1
  const geo = new THREE.IcosahedronGeometry(1, detail)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  const tmp = new THREE.Vector3()

  // Family bias (Bennu-like diamond, Itokawa elongated, Vesta flattened…)
  const family = Math.floor(seed * 7) % 5
  const stretch = new THREE.Vector3(
    1 + hash(seed * 3.1) * 0.45 - 0.1,
    1 + hash(seed * 5.7) * 0.4 - 0.15,
    1 + hash(seed * 9.2) * 0.45 - 0.1
  )
  if (family === 1) {
    // Itokawa-like elongated
    stretch.x *= 1.35
    stretch.y *= 0.75
    stretch.z *= 0.85
  } else if (family === 2) {
    // Vesta-like flattened
    stretch.y *= 0.7
  } else if (family === 3) {
    // Bennu diamond
    stretch.y *= 1.15
    stretch.x *= 0.9
  } else if (family === 4) {
    // Eros potato
    stretch.x *= 1.5
    stretch.z *= 0.7
  }

  // Precompute crater centers
  const craterCount = 4 + Math.floor(hash(seed * 11) * 10)
  const craters: { c: THREE.Vector3; r: number; d: number }[] = []
  for (let i = 0; i < craterCount; i++) {
    const u = hash(seed * 13 + i * 7)
    const v2 = hash(seed * 17 + i * 11)
    const theta = u * Math.PI * 2
    const phi = Math.acos(2 * v2 - 1)
    craters.push({
      c: new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ),
      r: 0.12 + hash(seed + i * 3) * 0.35,
      d: 0.08 + hash(seed + i * 5) * 0.18,
    })
  }

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()

    // Large-scale irregular silhouette
    let r = 1
    r += fbm3(v.x * 1.4, v.y * 1.4, v.z * 1.4, seed, 5) * 0.28
    r += fbm3(v.x * 3.2, v.y * 3.2, v.z * 3.2, seed + 40, 3) * 0.12

    // Fractured / chipped flats
    const chip = fbm3(v.x * 6, v.y * 6, v.z * 6, seed + 90, 2)
    if (chip > 0.45) r -= (chip - 0.45) * 0.35

    // Cracks (ridge depressions)
    const crack =
      Math.abs(fbm3(v.x * 8, v.y * 2, v.z * 8, seed + 120, 2))
    if (crack < 0.08) r -= 0.06

    // Craters
    for (const cr of craters) {
      const d = v.distanceTo(cr.c)
      if (d < cr.r) {
        const t = d / cr.r
        const bowl = Math.pow(1 - t, 1.6) * cr.d
        const rim = Math.exp(-Math.pow((t - 0.82) * 10, 2)) * cr.d * 0.45
        r -= bowl
        r += rim
      }
    }

    // Surface micro-roughness
    r += noise3(v.x * 18, v.y * 18, v.z * 18, seed + 200) * 0.035

    r = Math.max(0.35, Math.min(1.55, r))
    tmp.copy(v).multiply(stretch).multiplyScalar(r)
    pos.setXYZ(i, tmp.x, tmp.y, tmp.z)
  }

  // Weld / recompute
  geo.computeVertexNormals()
  // Flatten some normals for rocky facets
  const normals = geo.attributes.normal as THREE.BufferAttribute
  for (let i = 0; i < normals.count; i++) {
    const nx = normals.getX(i)
    const ny = normals.getY(i)
    const nz = normals.getZ(i)
    const facet = 0.85 + hash(seed + i * 0.01) * 0.15
    const len = Math.hypot(nx, ny, nz) || 1
    normals.setXYZ(i, (nx / len) * facet, (ny / len) * facet, (nz / len) * facet)
  }
  normals.needsUpdate = true
  pos.needsUpdate = true
  geo.computeBoundingSphere()
  return geo
}

/** Build a library of unique asteroid geometries (default 128). */
export function buildAsteroidLibrary(
  count = 128,
  lod: AsteroidLod = 'mid'
): THREE.BufferGeometry[] {
  const list: THREE.BufferGeometry[] = []
  for (let i = 0; i < count; i++) {
    list.push(createAsteroidGeometry(i * 17.13 + 3.7, lod))
  }
  return list
}

/** Rock / metal / carbon / ice-ish albedo palette (scientific, muted) */
export function asteroidColor(seed: number): THREE.Color {
  const t = hash(seed * 2.3)
  if (t < 0.45) {
    // Carbonaceous dark
    return new THREE.Color().setHSL(0.07, 0.08, 0.18 + hash(seed) * 0.12)
  }
  if (t < 0.7) {
    // Stony grey-brown
    return new THREE.Color().setHSL(0.08, 0.12, 0.28 + hash(seed + 1) * 0.15)
  }
  if (t < 0.88) {
    // Metallic
    return new THREE.Color().setHSL(0.1, 0.05, 0.4 + hash(seed + 2) * 0.2)
  }
  // Icy bright
  return new THREE.Color().setHSL(0.55, 0.06, 0.55 + hash(seed + 3) * 0.15)
}

export function asteroidRoughness(seed: number): number {
  return 0.72 + hash(seed * 4.1) * 0.26
}

export function asteroidMetalness(seed: number): number {
  const t = hash(seed * 2.3)
  if (t >= 0.7 && t < 0.88) return 0.45 + hash(seed) * 0.35
  if (t >= 0.88) return 0.08
  return 0.02 + hash(seed) * 0.1
}
