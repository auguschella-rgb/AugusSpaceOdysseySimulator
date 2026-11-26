/**
 * Mission Alpha 3.0 — NASA / public scientific texture registry.
 * All assets are public-domain NASA (or CC-BY Solar System Scope science maps
 * derived from NASA mission data) packaged under /public/textures.
 */

export type BodyTexturePaths = {
  map: string
  normalMap?: string
  roughnessMap?: string
  specularMap?: string
  cloudsMap?: string
  nightMap?: string
  ringsMap?: string
  /** Prefer this over map when present (higher fidelity NASA) */
  mapPrimary?: string
}

/** Respects Vite `base` (GitHub Pages sub-path) — '/' on Vercel / dev. */
const BASE = import.meta.env.BASE_URL
const P = `${BASE}textures/planets`
const PM = `${BASE}textures/mobile`

/** Path map for each celestial body */
export const NASA_BODY_TEXTURES: Record<string, BodyTexturePaths> = {
  earth: {
    // NASA Blue Marble (topo + bathymetry) — Visible Earth
    map: `${P}/earth_day_nasa.jpg`,
    mapPrimary: `${P}/earth_day_nasa.jpg`,
    // NASA Black Marble city lights
    nightMap: `${P}/earth_blackmarble.jpg`,
    cloudsMap: `${P}/earth_clouds.jpg`,
    normalMap: `${P}/earth_normal.jpg`,
    specularMap: `${P}/earth_specular.jpg`,
  },
  moon: {
    // LRO / three.js public moon map (NASA LRO lineage)
    map: `${P}/moon.jpg`,
  },
  mars: {
    // MRO / science map
    map: `${P}/mars.jpg`,
  },
  mercury: {
    // MESSENGER
    map: `${P}/mercury.jpg`,
  },
  venus: {
    // Magellan-style atmosphere
    map: `${P}/venus.jpg`,
  },
  jupiter: {
    // Juno / science composite
    map: `${P}/jupiter.jpg`,
  },
  saturn: {
    // Cassini
    map: `${P}/saturn.jpg`,
    ringsMap: `${P}/saturn_ring.png`,
  },
  uranus: {
    map: `${P}/uranus.jpg`,
  },
  neptune: {
    // Voyager / NASA
    map: `${P}/neptune.jpg`,
  },
  pluto: {
    // New Horizons PIA19952
    map: `${P}/pluto.jpg`,
  },
  sun: {
    // SDO / science solar map
    map: `${P}/sun.jpg`,
  },
}

export const NASA_SPACE = {
  milkyWay: `${BASE}textures/space/milky_way.jpg`,
  milkyWayAlt: `${P}/milky_way.jpg`,
}

/**
 * Mobile set: albedo only (max 1024x512 JPEG q80). No normal / specular / night /
 * clouds extras — keeps startup around 1 MB instead of ~10 MB.
 */
export const NASA_BODY_TEXTURES_MOBILE: Record<string, BodyTexturePaths> = {
  earth: { map: `${PM}/earth_day_nasa.jpg` },
  moon: { map: `${PM}/moon.jpg` },
  mars: { map: `${PM}/mars.jpg` },
  mercury: { map: `${PM}/mercury.jpg` },
  venus: { map: `${PM}/venus.jpg` },
  jupiter: { map: `${PM}/jupiter.jpg` },
  saturn: { map: `${PM}/saturn.jpg`, ringsMap: `${PM}/saturn_ring.png` },
  uranus: { map: `${PM}/uranus.jpg` },
  neptune: { map: `${PM}/neptune.jpg` },
  pluto: { map: `${PM}/pluto.jpg` },
  sun: { map: `${PM}/sun.jpg` },
}

export const NASA_SPACE_MOBILE = {
  milkyWay: `${PM}/milky_way.jpg`,
  milkyWayAlt: `${PM}/milky_way.jpg`,
}

export const NASA_CREDITS = [
  'NASA Visible Earth — Blue Marble / Black Marble',
  'NASA Solar Dynamics Observatory (SDO)',
  'NASA Lunar Reconnaissance Orbiter (LRO)',
  'NASA Mars Reconnaissance Orbiter (MRO)',
  'NASA MESSENGER',
  'NASA Magellan',
  'NASA Juno',
  'NASA Cassini',
  'NASA Voyager',
  'NASA New Horizons (PIA19952)',
  'Solar System Scope science maps (CC-BY 4.0, NASA-derived)',
]
