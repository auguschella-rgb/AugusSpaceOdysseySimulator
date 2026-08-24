/**
 * Async NASA texture loading — non-blocking startup.
 * Priority: Earth first, then visible majors, rest idle-time.
 * Derive PBR maps only after albedo is ready, yielding between bodies.
 */
import * as THREE from 'three'
import { NASA_BODY_TEXTURES, NASA_SPACE, type BodyTexturePaths } from '../data/nasaAssets'
import { getBodyMaps, type BodyMaps } from './planetTextures'
import { deriveForBody } from './derivePbrMaps'

export type LoadedBodyTextures = {
  map: THREE.Texture
  normalMap?: THREE.Texture
  roughnessMap?: THREE.Texture
  aoMap?: THREE.Texture
  displacementMap?: THREE.Texture
  cloudsMap?: THREE.Texture
  nightMap?: THREE.Texture
  ringsMap?: THREE.Texture
  isNasa: boolean
}

const cache = new Map<string, LoadedBodyTextures>()
const inflight = new Map<string, Promise<LoadedBodyTextures>>()
let milkyWay: THREE.Texture | null = null
let pipelineStarted = false

export type LoadPhase =
  | 'idle'
  | 'initializing'
  | 'loading_planets'
  | 'loading_nasa'
  | 'loading_environment'
  | 'ready'

let loadPhase: LoadPhase = 'idle'
const phaseListeners = new Set<(p: LoadPhase) => void>()

export function getLoadPhase() {
  return loadPhase
}

export function onLoadPhase(cb: (p: LoadPhase) => void): () => void {
  phaseListeners.add(cb)
  cb(loadPhase)
  return () => {
    phaseListeners.delete(cb)
  }
}

function setPhase(p: LoadPhase) {
  loadPhase = p
  phaseListeners.forEach((cb) => cb(p))
}

function yieldFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 48 })
    } else {
      setTimeout(resolve, 0)
    }
  })
}

function configureColorMap(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 16
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

function configureDataMap(tex: THREE.Texture) {
  tex.colorSpace = THREE.NoColorSpace
  tex.anisotropy = 12
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.needsUpdate = true
  return tex
}

function loadOne(loader: THREE.TextureLoader, url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    loader.load(
      url,
      (tex) => resolve(tex),
      undefined,
      (err) => {
        console.warn('[ASOS] texture failed', url, err)
        resolve(null)
      }
    )
  })
}

function invertTexture(tex: THREE.Texture): THREE.Texture {
  try {
    const img = tex.image as HTMLImageElement | HTMLCanvasElement | ImageBitmap
    if (!img) return tex
    const w = Math.min(1024, (img as HTMLImageElement).width || 512)
    const h = Math.min(512, (img as HTMLImageElement).height || 256)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return tex
    ctx.drawImage(img as CanvasImageSource, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h)
    const d = data.data
    for (let i = 0; i < d.length; i += 4) {
      const inv = 255 - d[i]
      d[i] = d[i + 1] = d[i + 2] = Math.min(255, inv + 40)
    }
    ctx.putImageData(data, 0, 0)
    const out = new THREE.CanvasTexture(canvas)
    out.needsUpdate = true
    return out
  } catch (e) {
    console.warn('[ASOS] invertTexture failed', e)
    return tex
  }
}

function applyDerived(id: string, result: LoadedBodyTextures) {
  try {
    const derived = deriveForBody(id, result.map)
    if (!derived) return
    if (!result.normalMap) result.normalMap = configureDataMap(derived.normalMap)
    if (!result.displacementMap) result.displacementMap = configureDataMap(derived.heightMap)
    if (!result.aoMap) result.aoMap = configureDataMap(derived.aoMap)
    if (!result.roughnessMap) result.roughnessMap = configureDataMap(derived.roughnessMap)
  } catch (e) {
    console.warn('[ASOS] derive PBR failed for', id, e)
  }
}

function proceduralFallback(id: string): LoadedBodyTextures {
  const proc = getBodyMaps(id)
  return {
    map: proc.map,
    normalMap: proc.normalMap,
    roughnessMap: proc.roughnessMap,
    aoMap: proc.aoMap,
    displacementMap: proc.displacementMap,
    cloudsMap: proc.cloudsMap,
    nightMap: proc.emissiveMap,
    ringsMap: proc.ringsMap,
    isNasa: false,
  }
}

async function loadBody(
  loader: THREE.TextureLoader,
  id: string,
  paths: BodyTexturePaths,
  derive: boolean
): Promise<LoadedBodyTextures> {
  try {
    const mapUrl = paths.mapPrimary ?? paths.map
    const map = await loadOne(loader, mapUrl)
    if (!map) return proceduralFallback(id)

    configureColorMap(map)
    const img = map.image as HTMLImageElement | undefined
    if (img && typeof img.decode === 'function') {
      try {
        await img.decode()
      } catch {
        /* ok */
      }
    }

    const result: LoadedBodyTextures = { map, isNasa: true }

    // Secondary maps in parallel (lighter than derive)
    const tasks: Promise<void>[] = []
    if (paths.normalMap) {
      tasks.push(
        loadOne(loader, paths.normalMap).then((n) => {
          if (n) result.normalMap = configureDataMap(n)
        })
      )
    }
    if (paths.specularMap) {
      tasks.push(
        loadOne(loader, paths.specularMap).then((s) => {
          if (s) result.roughnessMap = configureDataMap(invertTexture(s))
        })
      )
    }
    if (paths.cloudsMap) {
      tasks.push(
        loadOne(loader, paths.cloudsMap).then((c) => {
          if (c) result.cloudsMap = configureColorMap(c)
        })
      )
    }
    if (paths.nightMap) {
      tasks.push(
        loadOne(loader, paths.nightMap).then((n) => {
          if (n) result.nightMap = configureColorMap(n)
        })
      )
    }
    if (paths.ringsMap) {
      tasks.push(
        loadOne(loader, paths.ringsMap).then((r) => {
          if (r) {
            configureColorMap(r)
            result.ringsMap = r
          }
        })
      )
    }
    await Promise.all(tasks)

    if (derive) {
      await yieldFrame()
      applyDerived(id, result)
    }

    if (!result.ringsMap) {
      const proc = getBodyMaps(id)
      if (proc.ringsMap) result.ringsMap = proc.ringsMap
    }

    return result
  } catch (e) {
    console.warn('[ASOS] loadBody failed', id, e)
    return proceduralFallback(id)
  }
}

/** Ensure a body is loaded (on-demand). Reuses cache. */
export function ensureBodyTextures(id: string): Promise<LoadedBodyTextures> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!)
  if (inflight.has(id)) return inflight.get(id)!

  const paths = NASA_BODY_TEXTURES[id]
  if (!paths) {
    const fb = proceduralFallback(id)
    cache.set(id, fb)
    return Promise.resolve(fb)
  }

  const loader = new THREE.TextureLoader()
  const p = loadBody(loader, id, paths, true).then((tex) => {
    cache.set(id, tex)
    inflight.delete(id)
    return tex
  })
  inflight.set(id, p)
  return p
}

/**
 * Progressive non-blocking pipeline.
 * Priority bodies first → bump UI after first wave → rest in idle time.
 */
export function startTexturePipeline(onBodyReady?: (id: string) => void): Promise<void> {
  if (pipelineStarted) {
    return Promise.resolve()
  }
  pipelineStarted = true
  setPhase('initializing')

  return (async () => {
    const loader = new THREE.TextureLoader()
    const priority = ['earth', 'moon', 'mars', 'sun', 'jupiter', 'saturn']
    const rest = Object.keys(NASA_BODY_TEXTURES).filter((id) => !priority.includes(id))

    setPhase('loading_planets')
    // First pass: albedo + extras, skip heavy derive for speed
    for (const id of priority) {
      if (cache.has(id)) continue
      const paths = NASA_BODY_TEXTURES[id]
      if (!paths) continue
      try {
        const tex = await loadBody(loader, id, paths, false)
        cache.set(id, tex)
        onBodyReady?.(id)
      } catch (e) {
        console.warn(e)
        cache.set(id, proceduralFallback(id))
      }
      await yieldFrame()
    }

    setPhase('loading_nasa')
    // Derive PBR for priority (expensive) — one per idle slot
    for (const id of priority) {
      const cur = cache.get(id)
      if (cur && cur.isNasa && !cur.displacementMap) {
        await yieldFrame()
        applyDerived(id, cur)
        onBodyReady?.(id)
      }
    }

    setPhase('loading_environment')
    try {
      const mw =
        (await loadOne(loader, NASA_SPACE.milkyWay)) ??
        (await loadOne(loader, NASA_SPACE.milkyWayAlt))
      if (mw) {
        configureColorMap(mw)
        mw.mapping = THREE.EquirectangularReflectionMapping
        milkyWay = mw
      }
    } catch (e) {
      console.warn('[ASOS] milky way load failed', e)
    }

    // Remaining bodies during idle
    for (const id of rest) {
      await yieldFrame()
      if (cache.has(id)) continue
      try {
        const tex = await loadBody(loader, id, NASA_BODY_TEXTURES[id], true)
        cache.set(id, tex)
        onBodyReady?.(id)
      } catch {
        cache.set(id, proceduralFallback(id))
      }
    }

    setPhase('ready')
    console.info('[ASOS] NASA texture pipeline ready')
  })()
}

/** @deprecated use startTexturePipeline — kept for compatibility */
export function preloadNasaTextures(): Promise<void> {
  return startTexturePipeline()
}

export function getNasaBodyTextures(id: string): LoadedBodyTextures {
  if (cache.has(id)) return cache.get(id)!
  // Instant procedural so first paint never blocks; upgrade async
  const fb = proceduralFallback(id)
  // Kick background load
  void ensureBodyTextures(id)
  return fb
}

export function getMilkyWayTexture(): THREE.Texture | null {
  return milkyWay
}

export function areNasaTexturesReady(): boolean {
  return loadPhase === 'ready'
}

export function asBodyMaps(loaded: LoadedBodyTextures): BodyMaps {
  return {
    map: loaded.map,
    normalMap: loaded.normalMap,
    roughnessMap: loaded.roughnessMap,
    aoMap: loaded.aoMap,
    displacementMap: loaded.displacementMap,
    cloudsMap: loaded.cloudsMap,
    emissiveMap: loaded.nightMap,
    ringsMap: loaded.ringsMap,
  }
}
