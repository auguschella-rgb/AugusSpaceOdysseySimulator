import { create } from 'zustand'
import type { CameraModeId, WarpLevel } from '../data/missions'
import { PLANETS_BY_ID } from '../data/planets'
import { MISSIONS_BY_ID } from '../data/missions'

export type ControlMode = 'free' | 'spacecraft'

export type TravelPhase =
  | 'idle'
  | 'planning'
  | 'accelerating'
  | 'cruising'
  | 'approaching'
  | 'decelerating'
  | 'arrived'
  | 'cancelled'

/** Landing architecture foundation — full EVA/walk not implemented in Alpha 6.1 */
export type LandingPhase = 'orbit' | 'approach' | 'descent' | 'landed'

interface ExplorationState {
  controlMode: ControlMode
  setControlMode: (m: ControlMode) => void
  enterSpacecraft: () => void
  exitSpacecraft: () => void

  cameraMode: CameraModeId
  setCameraMode: (m: CameraModeId) => void

  warpLevel: WarpLevel
  setWarpLevel: (w: WarpLevel) => void
  isWarping: boolean
  setIsWarping: (v: boolean) => void

  travelTargetId: string | null
  travelPhase: TravelPhase
  travelProgress: number
  travelError: string | null
  startTravel: (targetId: string) => boolean
  setTravelPhase: (p: TravelPhase) => void
  setTravelProgress: (t: number) => void
  cancelTravel: () => void
  completeTravel: () => void

  /** Close-approach architecture only — never claims landed without landing physics */
  landingPhase: LandingPhase
  setLandingPhase: (p: LandingPhase) => void

  selectedDiscoveryId: string | null
  setSelectedDiscoveryId: (id: string | null) => void

  searchQuery: string
  setSearchQuery: (q: string) => void

  explorationHudOpen: boolean
  setExplorationHudOpen: (v: boolean) => void
}

export function resolveTravelBodyId(rawId: string): string | null {
  if (PLANETS_BY_ID[rawId]) return rawId
  const mission = MISSIONS_BY_ID[rawId]
  if (mission?.travelTargetId && PLANETS_BY_ID[mission.travelTargetId]) {
    return mission.travelTargetId
  }
  return null
}

export const useExplorationStore = create<ExplorationState>((set, get) => ({
  controlMode: 'free',
  setControlMode: (m) => set({ controlMode: m }),
  enterSpacecraft: () => set({ controlMode: 'spacecraft', cameraMode: 'pilot' }),
  exitSpacecraft: () => {
    get().cancelTravel()
    set({
      controlMode: 'free',
      cameraMode: 'explorer',
      warpLevel: 0,
      isWarping: false,
    })
  },

  cameraMode: 'explorer',
  setCameraMode: (m) =>
    set({
      cameraMode: m,
      controlMode: m === 'pilot' ? 'spacecraft' : 'free',
    }),

  warpLevel: 0,
  setWarpLevel: (w) => set({ warpLevel: w, isWarping: w > 0 }),
  isWarping: false,
  setIsWarping: (v) => set({ isWarping: v }),

  travelTargetId: null,
  travelPhase: 'idle',
  travelProgress: 0,
  travelError: null,
  startTravel: (targetId) => {
    const bodyId = resolveTravelBodyId(targetId)
    if (!bodyId) {
      set({
        travelError: 'Destination unavailable',
        travelPhase: 'idle',
        travelTargetId: null,
        travelProgress: 0,
        landingPhase: 'orbit',
      })
      return false
    }
    set({
      travelTargetId: bodyId,
      travelPhase: 'planning',
      travelProgress: 0,
      travelError: null,
      controlMode: 'spacecraft',
      cameraMode: 'pilot',
      landingPhase: 'approach',
    })
    return true
  },
  setTravelPhase: (p) => set({ travelPhase: p }),
  setTravelProgress: (t) => set({ travelProgress: Math.max(0, Math.min(1, t)) }),
  cancelTravel: () =>
    set({
      travelTargetId: null,
      travelPhase: 'cancelled',
      travelProgress: 0,
      travelError: null,
      landingPhase: 'orbit',
      isWarping: get().warpLevel > 0,
    }),
  completeTravel: () =>
    set({
      travelPhase: 'arrived',
      travelProgress: 1,
      warpLevel: 0,
      isWarping: false,
      // Stable close-orbit only — descent/landed reserved for future landing physics
      landingPhase: 'orbit',
    }),

  landingPhase: 'orbit',
  setLandingPhase: (p) => set({ landingPhase: p }),

  selectedDiscoveryId: null,
  setSelectedDiscoveryId: (id) => set({ selectedDiscoveryId: id }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),

  explorationHudOpen: true,
  setExplorationHudOpen: (v) => set({ explorationHudOpen: v }),
}))
