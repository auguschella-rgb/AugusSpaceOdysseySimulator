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

const P = '/textures/planets'

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
  milkyWay: '/textures/space/milky_way.jpg',
  milkyWayAlt: `${P}/milky_way.jpg`,
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
