import type { PlanetData } from '../data/planets'

const TWO_PI = Math.PI * 2
/** Reference epoch year for mean anomaly */
export const EPOCH_YEAR = 2000

/**
 * Compute orbital angle (radians) from year + continuous animation time.
 * Uses mean motion from real orbital period (Earth days).
 */
export function getOrbitalAngle(
  planet: PlanetData,
  year: number,
  animDays: number,
  phaseOffset = 0
): number {
  if (planet.orbitalPeriod === 0) return 0
  const daysFromEpoch = (year - EPOCH_YEAR) * 365.25 + animDays
  const period = Math.abs(planet.orbitalPeriod)
  const sign = planet.orbitalPeriod < 0 ? -1 : 1
  const revolutions = daysFromEpoch / period
  return ((sign * revolutions * TWO_PI + phaseOffset) % TWO_PI + TWO_PI) % TWO_PI
}

/** Sidereal rotation from real rotation period (negative = retrograde). Smooth continuous. */
export function getRotationAngle(
  planet: PlanetData,
  year: number,
  animDays: number
): number {
  if (planet.rotationPeriod === 0) return 0
  const daysFromEpoch = (year - EPOCH_YEAR) * 365.25 + animDays
  const revolutions = daysFromEpoch / Math.abs(planet.rotationPeriod)
  const sign = planet.rotationPeriod < 0 ? -1 : 1
  return ((sign * revolutions * TWO_PI) % TWO_PI + TWO_PI) % TWO_PI
}

/**
 * Elliptical position in orbital plane.
 * orbitRadius = semi-major axis (scene units)
 * eccentricity = e (0 = circle)
 * angle ≈ true anomaly (simplified mean anomaly mapping for smooth viz)
 */
export function orbitalPosition(
  orbitRadius: number,
  angle: number,
  inclinationDeg: number,
  eccentricity = 0
): [number, number, number] {
  const e = Math.min(0.95, Math.max(0, eccentricity))
  // Radius at true anomaly (using angle as true anomaly for cinematic elliptical paths)
  const r = (orbitRadius * (1 - e * e)) / (1 + e * Math.cos(angle))
  const inc = (inclinationDeg * Math.PI) / 180
  const x = Math.cos(angle) * r
  const z = Math.sin(angle) * r
  const y = Math.sin(angle) * Math.sin(inc) * r * 0.18
  return [x, y, z]
}

export function orbitalPositionForBody(
  planet: PlanetData,
  year: number,
  animDays: number
): [number, number, number] {
  const phase = PHASE_OFFSETS[planet.id] ?? 0
  const angle = getOrbitalAngle(planet, year, animDays, phase)
  return orbitalPosition(
    planet.orbitRadius,
    angle,
    planet.inclination,
    planet.eccentricity ?? 0
  )
}

/** World position including moon parent hierarchy */
export function getBodyWorldPosition(
  planet: PlanetData,
  planetsById: Record<string, PlanetData>,
  year: number,
  animDays: number
): [number, number, number] {
  if (planet.isMoon && planet.parentId) {
    const parent = planetsById[planet.parentId]
    if (parent) {
      const [px, py, pz] = orbitalPositionForBody(parent, year, animDays)
      const [mx, my, mz] = orbitalPositionForBody(planet, year, animDays)
      return [px + mx, py + my, pz + mz]
    }
  }
  if (planet.id === 'sun' || planet.orbitRadius <= 0) return [0, 0, 0]
  return orbitalPositionForBody(planet, year, animDays)
}

/** Instantaneous orbital speed (km/s) approx from period & semi-major (AU-scaled) */
export function getOrbitalSpeedKmS(planet: PlanetData, year: number, animDays: number): number {
  if (planet.orbitalPeriod <= 0 || planet.orbitRadius <= 0) return 0
  // Vis-viva-ish: for circular v = 2πa/T; for ellipse scale by current r
  const aKm = planet.semiMajorKm ?? planet.orbitRadius * 16_000_000 // rough scene→km if unset
  const e = planet.eccentricity ?? 0
  const phase = PHASE_OFFSETS[planet.id] ?? 0
  const nu = getOrbitalAngle(planet, year, animDays, phase)
  const r = (aKm * (1 - e * e)) / (1 + e * Math.cos(nu))
  const mu = (4 * Math.PI * Math.PI * aKm * aKm * aKm) / (planet.orbitalPeriod * 86400) ** 2
  // Simplified circular fallback
  const vCirc = (2 * Math.PI * aKm) / (planet.orbitalPeriod * 86400)
  if (e < 0.01) return vCirc
  // vis-viva: v = sqrt(GM(2/r - 1/a))
  const v = Math.sqrt(Math.max(0, mu * (2 / r - 1 / aKm)))
  return v
}

/** Current heliocentric distance in AU (approx) */
export function getDistanceAu(
  planet: PlanetData,
  year: number,
  animDays: number,
  planetsById?: Record<string, PlanetData>
): number {
  if (planet.id === 'sun') return 0
  let body = planet
  if (planet.isMoon && planet.parentId && planetsById?.[planet.parentId]) {
    body = planetsById[planet.parentId]
  }
  const a = body.semiMajorAu ?? body.orbitRadius / 18 // earth at 18 ≈ 1 AU
  const e = body.eccentricity ?? 0
  const phase = PHASE_OFFSETS[body.id] ?? 0
  const nu = getOrbitalAngle(body, year, animDays, phase)
  return (a * (1 - e * e)) / (1 + e * Math.cos(nu))
}

/** Simulated calendar date from year slider + animDays */
export function getSimulationDate(year: number, animDays: number): Date {
  const base = Date.UTC(Math.floor(year), 0, 1)
  const dayOfYear = (year % 1) * 365.25 + animDays
  return new Date(base + dayOfYear * 86400000)
}

/** Local solar time estimate from rotation angle (0–24h) */
export function getLocalTimeHours(planet: PlanetData, year: number, animDays: number): number {
  const rot = getRotationAngle(planet, year, animDays)
  // Map rotation to 0–24h (simplified)
  return ((rot / TWO_PI) * 24 + 24) % 24
}

/** Stable phase offsets so bodies don't all start aligned */
export const PHASE_OFFSETS: Record<string, number> = {
  mercury: 0.4,
  venus: 1.2,
  earth: 2.1,
  moon: 0.8,
  mars: 3.4,
  phobos: 1.1,
  deimos: 2.4,
  jupiter: 0.6,
  io: 0.3,
  europa: 1.5,
  ganymede: 2.7,
  callisto: 4.0,
  saturn: 4.2,
  titan: 1.9,
  uranus: 5.1,
  neptune: 2.8,
  triton: 3.3,
  pluto: 1.7,
  charon: 0.5,
  // comets
  halley: 0.2,
  'hale-bopp': 1.1,
  neowise: 2.6,
}
