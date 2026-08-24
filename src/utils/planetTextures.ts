/**
 * Mission Alpha V2.5 — Ultra NASA-inspired PBR texture synthesis.
 * Albedo · Normal · Roughness · AO · Displacement · Emissive · Clouds · Rings
 * Offline, high-detail, non-cartoon scientific coloration.
 */
import * as THREE from 'three'
import { clamp01, fbm, hash2, lerp, mixColor } from './noise'

const SIZE = 1280
const SIZE_LG = 1536
const SIZE_SM = 768
const SIZE_GAS = 1280

function makeCanvas(size: number) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  return { canvas, ctx, size }
}

function toTexture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

function normalFromHeight(height: Float32Array, size: number, strength = 3.5): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  const get = (x: number, y: number) => {
    x = ((x % size) + size) % size
    y = Math.max(0, Math.min(size - 1, y))
    return height[y * size + x]
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (get(x + 1, y) - get(x - 1, y)) * strength
      const dy = (get(x, y + 1) - get(x, y - 1)) * strength
      const nx = -dx
      const ny = -dy
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      const i = (y * size + x) * 4
      img.data[i] = ((nx / len) * 0.5 + 0.5) * 255
      img.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255
      img.data[i + 2] = ((nz / len) * 0.5 + 0.5) * 255
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, false)
}

function aoFromHeight(height: Float32Array, size: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  const get = (x: number, y: number) => {
    x = ((x % size) + size) % size
    y = Math.max(0, Math.min(size - 1, y))
    return height[y * size + x]
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = get(x, y)
      let occ = 0
      let n = 0
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (ox === 0 && oy === 0) continue
          const dh = get(x + ox, y + oy) - h
          if (dh > 0) occ += dh
          n++
        }
      }
      const ao = clamp01(1 - (occ / n) * 2.8)
      const g = Math.round(ao * 255)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, false)
}

function displacementFromHeight(height: Float32Array, size: number): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const g = Math.round(clamp01(height[i]) * 255)
    const j = i * 4
    img.data[j] = img.data[j + 1] = img.data[j + 2] = g
    img.data[j + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, false)
}

function fillFromFn(
  size: number,
  fn: (u: number, v: number, x: number, y: number) => [number, number, number, number?]
) {
  const { canvas, ctx } = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  const height = new Float32Array(size * size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const [r, g, b, h = 0.5] = fn(u, v, x, y)
      const i = (y * size + x) * 4
      img.data[i] = r
      img.data[i + 1] = g
      img.data[i + 2] = b
      img.data[i + 3] = 255
      height[y * size + x] = h
    }
  }
  ctx.putImageData(img, 0, 0)
  return { canvas, height }
}

function solidRough(size: number, value: number, variation = 0): THREE.Texture {
  if (variation <= 0) {
    const { canvas, ctx } = makeCanvas(size)
    const g = Math.round(value * 255)
    ctx.fillStyle = `rgb(${g},${g},${g})`
    ctx.fillRect(0, 0, size, size)
    return toTexture(canvas, false)
  }
  const { canvas, ctx } = makeCanvas(size)
  const img = ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm(x * 0.02, y * 0.02, 3)
      const g = Math.round(clamp01(value + (n - 0.5) * variation) * 255)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = g
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return toTexture(canvas, false)
}

function packMaps(
  canvas: HTMLCanvasElement,
  height: Float32Array,
  size: number,
  opts: {
    normalStr?: number
    rough?: number
    roughVar?: number
    emissive?: THREE.Texture
    clouds?: THREE.Texture
    rings?: THREE.Texture
  } = {}
): BodyMaps {
  return {
    map: toTexture(canvas),
    normalMap: normalFromHeight(height, size, opts.normalStr ?? 4),
    roughnessMap: solidRough(size, opts.rough ?? 0.85, opts.roughVar ?? 0.15),
    aoMap: aoFromHeight(height, size),
    displacementMap: displacementFromHeight(height, size),
    emissiveMap: opts.emissive,
    cloudsMap: opts.clouds,
    ringsMap: opts.rings,
  }
}

export type BodyMaps = {
  map: THREE.Texture
  normalMap?: THREE.Texture
  roughnessMap?: THREE.Texture
  aoMap?: THREE.Texture
  displacementMap?: THREE.Texture
  emissiveMap?: THREE.Texture
  cloudsMap?: THREE.Texture
  ringsMap?: THREE.Texture
}

const cache = new Map<string, BodyMaps>()

export function getBodyMaps(id: string): BodyMaps {
  if (cache.has(id)) return cache.get(id)!
  let maps: BodyMaps
  switch (id) {
    case 'earth':
      maps = buildEarth()
      break
    case 'moon':
      maps = buildMoon()
      break
    case 'mars':
      maps = buildMars()
      break
    case 'jupiter':
      maps = buildJupiter()
      break
    case 'saturn':
      maps = buildSaturn()
      break
    case 'venus':
      maps = buildVenus()
      break
    case 'mercury':
      maps = buildMercury()
      break
    case 'uranus':
      maps = buildUranus()
      break
    case 'neptune':
      maps = buildNeptune()
      break
    case 'pluto':
      maps = buildPluto()
      break
    case 'sun':
      maps = buildSun()
      break
    default:
      maps = buildMoon()
  }
  cache.set(id, maps)
  return maps
}

// ---------- Earth continents (sphere-projected blobs) ----------
function earthLand(u: number, v: number): number {
  const lon = u * Math.PI * 2
  const lat = (0.5 - v) * Math.PI
  const x = Math.cos(lat) * Math.cos(lon)
  const y = Math.sin(lat)
  const z = Math.cos(lat) * Math.sin(lon)
  const blobs: [number, number, number, number][] = [
    [0.7, 0.25, 0.05, 0.55],
    [0.55, 0.55, 0.05, 0.35],
    [0.35, 0.45, 0.55, 0.55],
    [0.55, 0.35, 0.75, 0.4],
    [-0.35, -0.2, 0.75, 0.22],
    [0.35, 0.45, -0.65, 0.45],
    [0.55, 0.2, -0.9, 0.28],
    [-0.15, -0.45, -0.55, 0.38],
    [-0.95, -0.3, 0, 0.5],
    [0.75, 0.15, -0.35, 0.2],
    [0.25, 0.15, 0.55, 0.18],
  ]
  let land = 0
  for (const [cx, cy, cz, r] of blobs) {
    const d = Math.hypot(x - cx, y - cy, z - cz)
    land = Math.max(land, clamp01(1 - d / r))
  }
  const n = fbm(u * 16, v * 12, 6) * 0.38
  const coast = fbm(u * 40, v * 32, 3) * 0.12
  return clamp01(land * 1.18 + n * 0.28 + coast - 0.2)
}

function craterField(u: number, v: number, density = 1): { shade: number; height: number } {
  let shade = 0
  let height = 0
  for (let layer = 0; layer < 4; layer++) {
    const scale = (7 + layer * 12) * density
    const cellsX = Math.floor(u * scale)
    const cellsY = Math.floor(v * scale * 0.5)
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const cx = cellsX + ox
        const cy = cellsY + oy
        const hx = hash2(cx + layer * 13, cy + layer * 7)
        const hy = hash2(cx + 3, cy + layer * 11)
        if (hash2(cx * 2 + layer, cy * 3) < 0.42) continue
        const px = (cx + hx) / scale
        const py = (cy + hy) / (scale * 0.5)
        const r = (0.012 + hash2(cx, cy + 5) * 0.045) / Math.sqrt(density + layer * 0.25)
        const d = Math.hypot(u - px, (v - py) * 0.5)
        if (d < r) {
          const t = d / r
          const bowl = Math.pow(1 - t, 1.6)
          const rim = Math.exp(-Math.pow((t - 0.82) * 9, 2)) * 0.45
          const central = t < 0.12 ? (1 - t / 0.12) * 0.15 : 0
          height += -bowl * 0.55 + rim + central
          shade += -bowl * 0.4 + rim * 0.25
        }
      }
    }
  }
  return { shade, height }
}

function buildEarth(): BodyMaps {
  const size = SIZE_LG
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const land = earthLand(u, v)
    const iceN = clamp01((0.11 - v) * 11)
    const iceS = clamp01((v - 0.89) * 11)
    const ice = Math.max(iceN, iceS) * (0.75 + fbm(u * 10, v * 10, 4) * 0.25)
    const elev = fbm(u * 22, v * 16, 7) * land
    const micro = fbm(u * 60, v * 48, 3)

    if (ice > 0.32) {
      const c = mixColor([195, 215, 235], [250, 252, 255], ice + micro * 0.1)
      return [...c, 0.82 + elev * 0.1]
    }
    if (land > 0.4) {
      const desert = clamp01(fbm(u * 7 + 2, v * 6, 4) * (1 - Math.abs(v - 0.48) * 2.8))
      const green = mixColor([28, 78, 38], [55, 105, 48], fbm(u * 24, v * 18, 4))
      const sand = mixColor([155, 135, 85], [185, 155, 95], fbm(u * 14, v * 12, 3))
      const rock = mixColor([85, 80, 70], [115, 105, 90], elev)
      let c = mixColor(green, sand, desert * 0.75)
      c = mixColor(c, rock, elev * 0.5)
      if (elev > 0.52 && (v < 0.32 || v > 0.68)) {
        c = mixColor(c, [235, 240, 245], (elev - 0.52) * 2.2)
      }
      // Dark forests
      c = mixColor(c, [20, 55, 30], (1 - desert) * 0.15 * fbm(u * 30, v * 25, 2))
      return [...c, 0.42 + elev * 0.48 + micro * 0.05]
    }
    // Deep blue oceans with bathymetry
    const depth = fbm(u * 10, v * 8, 5)
    const ridge = fbm(u * 20, v * 16, 3)
    let ocean = mixColor([4, 28, 72], [12, 70, 120], depth)
    ocean = mixColor(ocean, [18, 95, 130], ridge * 0.25)
    const shallow = mixColor(ocean, [30, 130, 140], clamp01((land - 0.22) * 5))
    return [...shallow, 0.04 + depth * 0.06]
  })

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const land = earthLand(u, v)
      height[y * size + x] =
        land > 0.4 ? 0.48 + fbm(u * 22, v * 16, 6) * 0.42 : 0.04 + fbm(u * 8, v * 6, 3) * 0.06
      if (v < 0.09 || v > 0.91) height[y * size + x] = 0.75
    }
  }

  // Night cities
  const night = makeCanvas(size)
  const nimg = night.ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const land = earthLand(u, v)
      const i = (y * size + x) * 4
      nimg.data[i + 3] = 255
      if (land > 0.43 && v > 0.14 && v < 0.86) {
        const city = fbm(u * 48 + 3, v * 36, 4)
        const spark = hash2(x * 0.71, y * 0.69)
        if (city > 0.5 && spark > 0.5) {
          const intensity = Math.pow((city - 0.5) * 2.2 * spark, 1.2)
          nimg.data[i] = Math.min(255, 255 * intensity)
          nimg.data[i + 1] = Math.min(255, 210 * intensity)
          nimg.data[i + 2] = Math.min(255, 90 * intensity)
        }
      }
    }
  }
  night.ctx.putImageData(nimg, 0, 0)

  // Multi-layer clouds
  const clouds = makeCanvas(size)
  const cimg = clouds.ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const c1 = fbm(u * 11 + 5, v * 8, 6)
      const c2 = fbm(u * 22 + 1, v * 16, 4)
      const swirl = fbm(u * 5 + v * 2, v * 6, 3)
      const dens = clamp01((c1 * 0.55 + c2 * 0.3 + swirl * 0.35 - 0.36) * 2.4)
      const i = (y * size + x) * 4
      cimg.data[i] = 255
      cimg.data[i + 1] = 255
      cimg.data[i + 2] = 255
      cimg.data[i + 3] = dens * 255
    }
  }
  clouds.ctx.putImageData(cimg, 0, 0)

  // Roughness: ocean glossy, land matte
  const rough = makeCanvas(size)
  const rimg = rough.ctx.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const land = earthLand(x / size, y / size)
      const i = (y * size + x) * 4
      const r = land > 0.4 ? 0.72 + hash2(x, y) * 0.22 : 0.08 + fbm(x * 0.01, y * 0.01, 2) * 0.08
      rimg.data[i] = rimg.data[i + 1] = rimg.data[i + 2] = r * 255
      rimg.data[i + 3] = 255
    }
  }
  rough.ctx.putImageData(rimg, 0, 0)

  return {
    map: toTexture(canvas),
    normalMap: normalFromHeight(height, size, 3.8),
    roughnessMap: toTexture(rough.canvas, false),
    aoMap: aoFromHeight(height, size),
    displacementMap: displacementFromHeight(height, size),
    emissiveMap: toTexture(night.canvas),
    cloudsMap: toTexture(clouds.canvas),
  }
}

function buildMoon(): BodyMaps {
  const size = SIZE
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const base = 125 + fbm(u * 7, v * 6, 6) * 45
    const maria = fbm(u * 3.5 + 1, v * 2.8, 4)
    const dark = maria > 0.52 ? 0.68 : 1
    const crater = craterField(u, v, 1.35)
    const dust = fbm(u * 45, v * 36, 4)
    const g = clamp01((base * dark + crater.shade * 95 + dust * 18) / 255)
    const c = Math.round(g * 200 + 18)
    // Slight warm/cool variation (lunar regolith)
    return [c + 4, c + 2, Math.round(c * 0.96), 0.48 + crater.height * 0.42 + dust * 0.08]
  })
  return packMaps(canvas, height, size, { normalStr: 6.5, rough: 0.94, roughVar: 0.08 })
}

function buildMercury(): BodyMaps {
  const size = SIZE
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const base = 105 + fbm(u * 9, v * 7, 6) * 55
    const crater = craterField(u, v, 1.75)
    const metal = fbm(u * 20, v * 16, 3)
    const g = clamp01((base + crater.shade * 100 + metal * 15) / 255)
    // Burnt metallic grey
    const r = Math.round(g * 185 + 30)
    const gre = Math.round(g * 175 + 25)
    const b = Math.round(g * 160 + 20)
    return [r, gre, b, 0.5 + crater.height * 0.48]
  })
  return packMaps(canvas, height, size, { normalStr: 7, rough: 0.88, roughVar: 0.12 })
}

function buildMars(): BodyMaps {
  const size = SIZE
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const canyon =
      Math.exp(-Math.pow((v - 0.48) * 16, 2)) *
      Math.exp(-Math.pow((u - 0.35) * 5.5, 2)) *
      (0.55 + fbm(u * 24, v * 10, 4))
    // Branch canyons
    const canyon2 =
      Math.exp(-Math.pow((v - 0.52) * 22, 2)) *
      Math.exp(-Math.pow((u - 0.42) * 8, 2)) *
      fbm(u * 30, v * 12, 3) *
      0.6
    const oly =
      Math.exp(-Math.pow((u - 0.72) * 9, 2) - Math.pow((v - 0.42) * 11, 2)) *
      (0.65 + fbm(u * 18, v * 18, 3) * 0.3)
    // Second volcano region
    const volc =
      Math.exp(-Math.pow((u - 0.78) * 14, 2) - Math.pow((v - 0.38) * 16, 2)) * 0.45
    const terrain = fbm(u * 14, v * 12, 7)
    const dust = fbm(u * 6 + 2, v * 5, 4)
    const dustStorm = clamp01(fbm(u * 3 + v, v * 2, 3) - 0.55) * 0.35

    let r = 135 + terrain * 55 + dust * 35
    let g = 62 + terrain * 28 + dust * 18
    let b = 35 + terrain * 16
    r -= (canyon + canyon2) * 55
    g -= (canyon + canyon2) * 38
    b -= (canyon + canyon2) * 22
    r += (oly + volc) * 45
    g += (oly + volc) * 28
    b += (oly + volc) * 12
    // Dust storm haze
    r = lerp(r, 180, dustStorm)
    g = lerp(g, 120, dustStorm)
    b = lerp(b, 70, dustStorm)

    const iceN = clamp01((0.095 - v) * 13)
    const iceS = clamp01((v - 0.905) * 13)
    const ice = Math.max(iceN, iceS)
    if (ice > 0.18) {
      const c = mixColor([r, g, b], [235, 240, 248], ice)
      return [...c, 0.72 + ice * 0.2]
    }
    const crater = craterField(u, v, 0.75)
    r += crater.shade * 45
    g += crater.shade * 32
    b += crater.shade * 22
    return [
      clamp01(r / 255) * 255,
      clamp01(g / 255) * 255,
      clamp01(b / 255) * 255,
      0.32 + terrain * 0.32 + (canyon + canyon2) * 0.25 + oly * 0.45 + crater.height * 0.2,
    ]
  })
  return packMaps(canvas, height, size, { normalStr: 5.2, rough: 0.9, roughVar: 0.1 })
}

function gasBands(
  u: number,
  v: number,
  palette: [number, number, number][],
  stormU = -1,
  stormV = -1,
  stormColor: [number, number, number] = [180, 70, 45]
): [number, number, number, number] {
  const warp = fbm(u * 3, v * 10, 4)
  const bands = Math.sin(v * Math.PI * 22 + warp * 2.2)
  const t = clamp01(bands * 0.5 + 0.5 + fbm(u * 8, v * 16, 5) * 0.18)
  const idx = t * (palette.length - 1)
  const i0 = Math.floor(idx)
  const i1 = Math.min(palette.length - 1, i0 + 1)
  let c = mixColor(palette[i0], palette[i1], idx - i0)
  const turb = fbm(u * 28 + v * 4, v * 20, 5)
  c = mixColor(c, palette[i0], turb * 0.22)
  // Small storms
  for (let s = 0; s < 5; s++) {
    const su = hash2(s * 7, 3)
    const sv = 0.25 + hash2(s * 11, 5) * 0.5
    const dx = (u - su + 0.5) % 1 - 0.5
    const dy = (v - sv) * 2.2
    const d = Math.hypot(dx * 8, dy * 10)
    if (d < 1) {
      c = mixColor(c, palette[(i0 + 2) % palette.length], (1 - d) * (1 - d) * 0.45)
    }
  }
  if (stormU >= 0) {
    const dx = (u - stormU + 0.5) % 1 - 0.5
    const dy = (v - stormV) * 1.7
    const d = Math.hypot(dx * 3.2, dy * 4.8)
    if (d < 1) {
      const s = clamp01(1 - d)
      const swirl = Math.sin(Math.atan2(dy, dx) * 4 + d * 10) * 0.5 + 0.5
      c = mixColor(c, stormColor, s * s * (0.55 + swirl * 0.45))
    }
  }
  return [...c, 0.5 + turb * 0.12]
}

function buildJupiter(): BodyMaps {
  const size = SIZE_GAS
  const palette: [number, number, number][] = [
    [195, 165, 125],
    [165, 125, 88],
    [220, 190, 150],
    [145, 105, 75],
    [190, 150, 110],
    [235, 205, 165],
    [135, 100, 70],
    [175, 140, 105],
  ]
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const [r, g, b] = gasBands(u, v, palette, 0.68, 0.58, [175, 65, 40])
    const white = clamp01(fbm(u * 10, v * 24, 4) - 0.42)
    const c = mixColor([r, g, b], [245, 232, 205], white * 0.55)
    return [...c, 0.5 + fbm(u * 20, v * 30, 3) * 0.08]
  })
  return packMaps(canvas, height, size, { normalStr: 1.6, rough: 0.68, roughVar: 0.12 })
}

function buildSaturn(): BodyMaps {
  const size = SIZE_GAS
  const palette: [number, number, number][] = [
    [220, 200, 155],
    [190, 170, 125],
    [235, 215, 175],
    [180, 160, 115],
    [210, 190, 145],
    [200, 180, 135],
  ]
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const [r, g, b] = gasBands(u, v, palette)
    return [r, g, b, 0.5]
  })

  // Ultra ring texture with particle density variation
  const rings = makeCanvas(SIZE)
  const rimg = rings.ctx.createImageData(SIZE, SIZE)
  const cx = SIZE / 2
  const cy = SIZE / 2
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx
      const dy = y - cy
      const dist = Math.hypot(dx, dy) / (SIZE / 2)
      const i = (y * SIZE + x) * 4
      if (dist < 0.5 || dist > 0.99) {
        rimg.data[i + 3] = 0
        continue
      }
      const t = (dist - 0.5) / 0.49
      const cassini = t > 0.47 && t < 0.55 ? 0.04 : 1
      const encke = t > 0.72 && t < 0.74 ? 0.15 : 1
      const fine = 0.35 + Math.sin(t * 120) * 0.2 + Math.sin(t * 340) * 0.08
      const density = fbm(t * 50, dist * 8, 4)
      const alpha =
        clamp01(fine * density * cassini * encke * (1 - Math.abs(t - 0.5) * 0.55)) * 0.95
      const col = mixColor(
        [200, 185, 150],
        [165, 145, 110],
        fbm(t * 30, dist * 6, 3)
      )
      // Ice sparkle
      const ice = hash2(x * 0.3, y * 0.3) > 0.97 ? 40 : 0
      rimg.data[i] = Math.min(255, col[0] + ice)
      rimg.data[i + 1] = Math.min(255, col[1] + ice)
      rimg.data[i + 2] = Math.min(255, col[2] + ice * 0.8)
      rimg.data[i + 3] = alpha * 255
    }
  }
  rings.ctx.putImageData(rimg, 0, 0)

  return {
    ...packMaps(canvas, height, size, { normalStr: 1.3, rough: 0.66, roughVar: 0.1 }),
    ringsMap: toTexture(rings.canvas),
  }
}

function buildVenus(): BodyMaps {
  const size = SIZE
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const swirl = fbm(u * 5 + v * 0.6, v * 7, 6)
    const flow = fbm(u * 10 + swirl * 2, v * 5, 5)
    const deep = fbm(u * 3, v * 4, 3)
    let c = mixColor([210, 175, 95], [185, 145, 70], swirl)
    c = mixColor(c, [245, 220, 160], flow * 0.45)
    c = mixColor(c, [160, 120, 60], deep * 0.2)
    return [...c, 0.42 + swirl * 0.12]
  })
  return packMaps(canvas, height, size, { normalStr: 1.0, rough: 0.48, roughVar: 0.1 })
}

function buildUranus(): BodyMaps {
  const size = SIZE_SM
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const band = Math.sin(v * Math.PI * 7 + fbm(u * 2, v * 4, 3) * 0.6) * 0.5 + 0.5
    let c = mixColor([125, 195, 200], [90, 165, 180], band)
    const haze = fbm(u * 4, v * 6, 4)
    c = mixColor(c, [170, 220, 225], haze * 0.3)
    // Frozen atmosphere soft gradient poles
    const pole = Math.pow(Math.abs(v - 0.5) * 2, 1.5)
    c = mixColor(c, [200, 235, 240], pole * 0.25)
    return [...c, 0.5]
  })
  return packMaps(canvas, height, size, { normalStr: 0.7, rough: 0.55, roughVar: 0.08 })
}

function buildNeptune(): BodyMaps {
  const size = SIZE
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const band = Math.sin(v * Math.PI * 14 + fbm(u * 4, v * 7, 4) * 1.4) * 0.5 + 0.5
    let c = mixColor([15, 40, 120], [30, 75, 185], band)
    c = mixColor(c, [50, 100, 210], fbm(u * 10, v * 12, 4) * 0.32)
    // Dark storms
    for (let s = 0; s < 3; s++) {
      const su = 0.3 + s * 0.2
      const sv = 0.35 + s * 0.12
      const dx = (u - su + 0.5) % 1 - 0.5
      const dy = v - sv
      const d = Math.hypot(dx * 5, dy * 7)
      if (d < 1) c = mixColor(c, [8, 18, 60], (1 - d) * (1 - d) * 0.75)
    }
    // High wind white clouds
    const cloud = clamp01(fbm(u * 18 + 2, v * 9, 4) - 0.52)
    c = mixColor(c, [170, 195, 250], cloud * 0.65)
    return [...c, 0.5 + cloud * 0.08]
  })
  return packMaps(canvas, height, size, { normalStr: 1.2, rough: 0.6, roughVar: 0.1 })
}

function buildPluto(): BodyMaps {
  const size = SIZE_SM
  const { canvas, height } = fillFromFn(size, (u, v) => {
    const terrain = fbm(u * 12, v * 10, 6)
    const heart =
      Math.exp(-Math.pow((u - 0.45) * 5, 2) - Math.pow((v - 0.5) * 4.5, 2)) *
      (0.72 + fbm(u * 9, v * 9, 3) * 0.28)
    let c = mixColor([80, 68, 58], [130, 110, 92], terrain)
    c = mixColor(c, [225, 220, 215], heart)
    const ice = fbm(u * 7 + 3, v * 6, 4)
    if (ice > 0.58) c = mixColor(c, [200, 205, 215], (ice - 0.58) * 2.2)
    const crater = craterField(u, v, 0.85)
    c = [
      clamp01((c[0] + crater.shade * 45) / 255) * 255,
      clamp01((c[1] + crater.shade * 45) / 255) * 255,
      clamp01((c[2] + crater.shade * 45) / 255) * 255,
    ]
    return [...c, 0.38 + terrain * 0.32 + heart * 0.22 + crater.height * 0.22]
  })
  return packMaps(canvas, height, size, { normalStr: 4.5, rough: 0.91, roughVar: 0.1 })
}

function buildSun(): BodyMaps {
  const size = SIZE
  const { canvas } = fillFromFn(size, (u, v) => {
    const gran = fbm(u * 50, v * 38, 5)
    const gran2 = fbm(u * 90 + 2, v * 70, 4)
    const spot = fbm(u * 7, v * 6, 4)
    let c = mixColor([255, 230, 140], [255, 150, 35], gran * 0.55 + gran2 * 0.35)
    if (spot > 0.7) c = mixColor(c, [100, 40, 15], (spot - 0.7) * 3.2)
    c = mixColor([255, 248, 210], c, 0.65)
    return [...c, gran]
  })
  return { map: toTexture(canvas) }
}

// silence unused
void lerp
