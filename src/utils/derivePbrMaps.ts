/**
 * Derive scientific-looking PBR maps from a NASA albedo texture
 * when dedicated normal/height/AO/roughness maps are unavailable.
 */
import * as THREE from 'three'

export type DerivedPbr = {
  normalMap: THREE.CanvasTexture
  heightMap: THREE.CanvasTexture
  aoMap: THREE.CanvasTexture
  roughnessMap: THREE.CanvasTexture
}

const MAX = 1024

function getImageSource(tex: THREE.Texture): CanvasImageSource | null {
  const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap | undefined
  if (!img) return null
  return img as CanvasImageSource
}

function sampleSize(src: CanvasImageSource): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth || src.width, h: src.naturalHeight || src.height }
  if (src instanceof HTMLCanvasElement) return { w: src.width, h: src.height }
  if (typeof ImageBitmap !== 'undefined' && src instanceof ImageBitmap) return { w: src.width, h: src.height }
  return { w: 512, h: 512 }
}

/**
 * Build normal / height / AO / roughness from albedo luminance & high-frequency detail.
 * Strength profiles tuned per body type.
 */
export function derivePbrFromAlbedo(
  albedo: THREE.Texture,
  opts: {
    /** Height from luminance strength */
    heightStrength?: number
    /** Normal map contrast */
    normalStrength?: number
    /** Extra roughness for rocky bodies */
    rockRoughness?: number
    /** Oceans (dark blue) → smooth for Earth-like */
    oceanSmooth?: boolean
  } = {}
): DerivedPbr | null {
  const src = getImageSource(albedo)
  if (!src) return null

  const { w: sw, h: sh } = sampleSize(src)
  const w = Math.min(MAX, sw || 512)
  const h = Math.min(MAX, sh || 512)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(src, 0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data

  const heightStrength = opts.heightStrength ?? 1
  const normalStrength = opts.normalStrength ?? 2.8
  const rockRough = opts.rockRoughness ?? 0.75
  const oceanSmooth = opts.oceanSmooth ?? false

  const height = new Float32Array(w * h)
  const rough = new Uint8ClampedArray(w * h)

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      const r = d[i] / 255
      const g = d[i + 1] / 255
      const b = d[i + 2] / 255
      const lum = r * 0.299 + g * 0.587 + b * 0.114
      // Blue-ish dark → ocean
      const isOcean = oceanSmooth && b > r * 1.15 && b > g * 1.05 && lum < 0.55
      // Polar ice
      const isIce = lum > 0.82 && Math.abs(r - g) < 0.08 && Math.abs(g - b) < 0.08

      let ht = lum
      if (isOcean) ht = 0.05 + lum * 0.08
      if (isIce) ht = 0.55 + lum * 0.2
      // Emphasize mid-tone terrain detail
      ht = Math.pow(ht, 0.9) * heightStrength
      height[y * w + x] = ht

      // Roughness: oceans smooth, ice medium, land rough + high-freq noise from chroma
      const chroma = Math.max(r, g, b) - Math.min(r, g, b)
      let roughV = rockRough + chroma * 0.3 + (1 - lum) * 0.1
      if (isOcean) roughV = 0.08 + lum * 0.1
      if (isIce) roughV = 0.35
      rough[y * w + x] = Math.round(Math.min(1, Math.max(0.05, roughV)) * 255)
    }
  }

  // Height texture
  const hCanvas = document.createElement('canvas')
  hCanvas.width = w
  hCanvas.height = h
  const hCtx = hCanvas.getContext('2d')!
  const hImg = hCtx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const v = Math.round(Math.min(1, Math.max(0, height[i])) * 255)
    const j = i * 4
    hImg.data[j] = hImg.data[j + 1] = hImg.data[j + 2] = v
    hImg.data[j + 3] = 255
  }
  hCtx.putImageData(hImg, 0, 0)

  // Normal from height (Sobel)
  const nCanvas = document.createElement('canvas')
  nCanvas.width = w
  nCanvas.height = h
  const nCtx = nCanvas.getContext('2d')!
  const nImg = nCtx.createImageData(w, h)
  const getH = (x: number, y: number) => {
    x = ((x % w) + w) % w
    y = Math.max(0, Math.min(h - 1, y))
    return height[y * w + x]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (getH(x + 1, y) - getH(x - 1, y)) * normalStrength
      const dy = (getH(x, y + 1) - getH(x, y - 1)) * normalStrength
      const nx = -dx
      const ny = -dy
      const nz = 1
      const len = Math.hypot(nx, ny, nz) || 1
      const j = (y * w + x) * 4
      nImg.data[j] = ((nx / len) * 0.5 + 0.5) * 255
      nImg.data[j + 1] = ((ny / len) * 0.5 + 0.5) * 255
      nImg.data[j + 2] = ((nz / len) * 0.5 + 0.5) * 255
      nImg.data[j + 3] = 255
    }
  }
  nCtx.putImageData(nImg, 0, 0)

  // AO from local height occlusion
  const aCanvas = document.createElement('canvas')
  aCanvas.width = w
  aCanvas.height = h
  const aCtx = aCanvas.getContext('2d')!
  const aImg = aCtx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const h0 = getH(x, y)
      let occ = 0
      let n = 0
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          if (!ox && !oy) continue
          const dh = getH(x + ox, y + oy) - h0
          if (dh > 0) occ += dh
          n++
        }
      }
      const ao = Math.min(1, Math.max(0.25, 1 - (occ / n) * 2.4))
      const j = (y * w + x) * 4
      const v = Math.round(ao * 255)
      aImg.data[j] = aImg.data[j + 1] = aImg.data[j + 2] = v
      aImg.data[j + 3] = 255
    }
  }
  aCtx.putImageData(aImg, 0, 0)

  // Roughness
  const rCanvas = document.createElement('canvas')
  rCanvas.width = w
  rCanvas.height = h
  const rCtx = rCanvas.getContext('2d')!
  const rImg = rCtx.createImageData(w, h)
  for (let i = 0; i < w * h; i++) {
    const j = i * 4
    const v = rough[i]
    rImg.data[j] = rImg.data[j + 1] = rImg.data[j + 2] = v
    rImg.data[j + 3] = 255
  }
  rCtx.putImageData(rImg, 0, 0)

  const mk = (c: HTMLCanvasElement, srgb = false) => {
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 12
    t.wrapS = THREE.RepeatWrapping
    t.wrapT = THREE.ClampToEdgeWrapping
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.needsUpdate = true
    return t
  }

  return {
    normalMap: mk(nCanvas),
    heightMap: mk(hCanvas),
    aoMap: mk(aCanvas),
    roughnessMap: mk(rCanvas),
  }
}

/** Body-type derivation presets */
export function deriveForBody(id: string, albedo: THREE.Texture): DerivedPbr | null {
  switch (id) {
    case 'earth':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 1.1,
        normalStrength: 3.2,
        rockRoughness: 0.72,
        oceanSmooth: true,
      })
    case 'mars':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 1.35,
        normalStrength: 4.2,
        rockRoughness: 0.88,
      })
    case 'moon':
    case 'mercury':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 1.5,
        normalStrength: 5.5,
        rockRoughness: 0.94,
      })
    case 'pluto':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 1.25,
        normalStrength: 4.0,
        rockRoughness: 0.85,
      })
    case 'venus':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 0.4,
        normalStrength: 1.2,
        rockRoughness: 0.55,
      })
    case 'jupiter':
    case 'saturn':
    case 'uranus':
    case 'neptune':
      return derivePbrFromAlbedo(albedo, {
        heightStrength: 0.35,
        normalStrength: 1.4,
        rockRoughness: 0.65,
      })
    default:
      return derivePbrFromAlbedo(albedo, {})
  }
}
