import { create } from 'zustand'
import { loadPersistedState, savePersistedState } from '../utils/persistState'

export type PanelId = 'settings' | 'music' | 'help' | 'about' | 'camera' | null

export interface SimulatorState {
  // App flow
  bootComplete: boolean
  setBootComplete: (v: boolean) => void
  hasStarted: boolean
  setHasStarted: (v: boolean) => void

  // Simulation time
  simulationYear: number
  setSimulationYear: (year: number) => void
  simulationSpeed: number
  setSimulationSpeed: (speed: number) => void
  isPaused: boolean
  setIsPaused: (v: boolean) => void
  togglePause: () => void
  resetSimulation: () => void
  /** Synced from SimulationClock for live telemetry outside Canvas */
  liveAnimDays: number
  setLiveAnimDays: (d: number) => void

  // Selection & camera
  selectedPlanetId: string | null
  setSelectedPlanetId: (id: string | null) => void
  focusPlanetId: string | null
  setFocusPlanetId: (id: string | null) => void
  /** Intentional selection (panel / list / double-click) — locks focus */
  selectPlanet: (id: string, fly?: boolean) => void
  clearSelection: () => void
  cameraFlying: boolean
  setCameraFlying: (v: boolean) => void
  /** Pointer moved enough to count as drag (blocks click-select) */
  pointerDragging: boolean
  setPointerDragging: (v: boolean) => void
  /** Timestamp of last intentional body double-click (blocks fullscreen toggle) */
  lastBodyDblClickAt: number
  markBodyDblClick: () => void
  /** Saved camera distance for restore */
  savedCameraDistance: number
  setSavedCameraDistance: (d: number) => void
  savedCameraY: number
  setSavedCameraY: (y: number) => void

  // UI
  photoMode: boolean
  setPhotoMode: (v: boolean) => void
  togglePhotoMode: () => void
  activePanel: PanelId
  setActivePanel: (panel: PanelId) => void
  togglePanel: (panel: Exclude<PanelId, null>) => void
  showOrbits: boolean
  setShowOrbits: (v: boolean) => void
  showLabels: boolean
  setShowLabels: (v: boolean) => void
  filmGrain: boolean
  setFilmGrain: (v: boolean) => void
  cinematicMode: boolean
  setCinematicMode: (v: boolean) => void
  preferFullscreen: boolean
  setPreferFullscreen: (v: boolean) => void
  isFullscreen: boolean
  setIsFullscreen: (v: boolean) => void

  // Audio
  musicEnabled: boolean
  setMusicEnabled: (v: boolean) => void
  musicVolume: number
  setMusicVolume: (v: number) => void
  sfxEnabled: boolean
  setSfxEnabled: (v: boolean) => void

  // Camera control helpers
  cameraAction: 'none' | 'reset' | 'zoomIn' | 'zoomOut' | 'topView' | 'refocus'
  requestCameraAction: (action: SimulatorState['cameraAction']) => void
  clearCameraAction: () => void

  /** Flush current prefs to localStorage */
  persistNow: () => void
  /** Apply saved prefs (called once after hydrate) */
  hydrateFromStorage: () => void
}

const DEFAULT_YEAR = 2025
const DEFAULT_SPEED = 1

function persistSlice(get: () => SimulatorState) {
  const s = get()
  savePersistedState({
    selectedPlanetId: s.selectedPlanetId,
    focusPlanetId: s.focusPlanetId,
    simulationSpeed: s.simulationSpeed,
    simulationYear: s.simulationYear,
    musicVolume: s.musicVolume,
    musicEnabled: s.musicEnabled,
    cinematicMode: s.cinematicMode,
    showOrbits: s.showOrbits,
    showLabels: s.showLabels,
    filmGrain: s.filmGrain,
    sfxEnabled: s.sfxEnabled,
    preferFullscreen: s.preferFullscreen,
    cameraDistance: s.savedCameraDistance,
    cameraY: s.savedCameraY,
  })
}

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  bootComplete: false,
  setBootComplete: (v) => set({ bootComplete: v }),
  hasStarted: false,
  setHasStarted: (v) => set({ hasStarted: v }),

  simulationYear: DEFAULT_YEAR,
  setSimulationYear: (year) => {
    set({ simulationYear: year })
    persistSlice(get)
  },
  simulationSpeed: DEFAULT_SPEED,
  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed })
    persistSlice(get)
  },
  isPaused: false,
  setIsPaused: (v) => set({ isPaused: v }),
  togglePause: () => set({ isPaused: !get().isPaused }),
  liveAnimDays: 0,
  setLiveAnimDays: (d) => set({ liveAnimDays: d }),
  resetSimulation: () =>
    set({
      simulationYear: DEFAULT_YEAR,
      simulationSpeed: DEFAULT_SPEED,
      isPaused: false,
      liveAnimDays: 0,
      selectedPlanetId: null,
      focusPlanetId: null,
      cameraFlying: false,
      cameraAction: 'reset',
    }),

  selectedPlanetId: null,
  setSelectedPlanetId: (id) => {
    set({ selectedPlanetId: id })
    persistSlice(get)
  },
  focusPlanetId: null,
  setFocusPlanetId: (id) => set({ focusPlanetId: id }),
  selectPlanet: (id, fly = true) => {
    set({
      selectedPlanetId: id,
      focusPlanetId: id,
      cameraFlying: fly,
    })
    persistSlice(get)
  },
  clearSelection: () => {
    set({ selectedPlanetId: null, focusPlanetId: null, cameraFlying: false })
    persistSlice(get)
  },
  cameraFlying: false,
  setCameraFlying: (v) => set({ cameraFlying: v }),
  pointerDragging: false,
  setPointerDragging: (v) => set({ pointerDragging: v }),
  lastBodyDblClickAt: 0,
  markBodyDblClick: () => set({ lastBodyDblClickAt: performance.now() }),
  savedCameraDistance: 95,
  setSavedCameraDistance: (d) => set({ savedCameraDistance: d }),
  savedCameraY: 38,
  setSavedCameraY: (y) => set({ savedCameraY: y }),

  photoMode: false,
  setPhotoMode: (v) => set({ photoMode: v }),
  togglePhotoMode: () => set({ photoMode: !get().photoMode }),
  activePanel: null,
  setActivePanel: (panel) => set({ activePanel: panel }),
  togglePanel: (panel) =>
    set({ activePanel: get().activePanel === panel ? null : panel }),
  showOrbits: true,
  setShowOrbits: (v) => {
    set({ showOrbits: v })
    persistSlice(get)
  },
  showLabels: true,
  setShowLabels: (v) => {
    set({ showLabels: v })
    persistSlice(get)
  },
  filmGrain: true,
  setFilmGrain: (v) => {
    set({ filmGrain: v })
    persistSlice(get)
  },
  cinematicMode: true,
  setCinematicMode: (v) => {
    set({ cinematicMode: v })
    persistSlice(get)
  },
  preferFullscreen: false,
  setPreferFullscreen: (v) => {
    set({ preferFullscreen: v })
    persistSlice(get)
  },
  isFullscreen: false,
  setIsFullscreen: (v) => set({ isFullscreen: v }),

  musicEnabled: false,
  setMusicEnabled: (v) => {
    set({ musicEnabled: v })
    persistSlice(get)
  },
  musicVolume: 0.35,
  setMusicVolume: (v) => {
    set({ musicVolume: v })
    persistSlice(get)
  },
  sfxEnabled: true,
  setSfxEnabled: (v) => {
    set({ sfxEnabled: v })
    persistSlice(get)
  },

  cameraAction: 'none',
  requestCameraAction: (action) => set({ cameraAction: action }),
  clearCameraAction: () => set({ cameraAction: 'none' }),

  persistNow: () => persistSlice(get),
  hydrateFromStorage: () => {
    const p = loadPersistedState()
    if (!p) return
    set({
      selectedPlanetId: p.selectedPlanetId ?? null,
      focusPlanetId: p.focusPlanetId ?? p.selectedPlanetId ?? null,
      simulationSpeed: p.simulationSpeed ?? DEFAULT_SPEED,
      simulationYear: p.simulationYear ?? DEFAULT_YEAR,
      musicVolume: p.musicVolume ?? 0.35,
      musicEnabled: p.musicEnabled ?? false,
      cinematicMode: p.cinematicMode ?? true,
      showOrbits: p.showOrbits ?? true,
      showLabels: p.showLabels ?? true,
      filmGrain: p.filmGrain ?? true,
      sfxEnabled: p.sfxEnabled ?? true,
      preferFullscreen: p.preferFullscreen ?? false,
      savedCameraDistance: p.cameraDistance ?? 95,
      savedCameraY: p.cameraY ?? 38,
    })
  },
}))
