/**
 * Persist / restore user preferences and exploration state.
 * Does not touch rendering or simulation physics.
 */

const KEY = 'asos-alpha-33-state'

export type PersistedState = {
  selectedPlanetId: string | null
  focusPlanetId: string | null
  simulationSpeed: number
  simulationYear: number
  musicVolume: number
  musicEnabled: boolean
  musicStyle: 'ambient' | 'retro'
  cinematicMode: boolean
  showOrbits: boolean
  showLabels: boolean
  filmGrain: boolean
  sfxEnabled: boolean
  preferFullscreen: boolean
  /** Approximate camera distance from origin */
  cameraDistance: number
  cameraY: number
}

export function loadPersistedState(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<PersistedState>
  } catch {
    return null
  }
}

export function savePersistedState(partial: Partial<PersistedState>) {
  try {
    const prev = loadPersistedState() ?? {}
    const next = { ...prev, ...partial }
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
}
