import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useExplorationStore } from '../../store/useExplorationStore'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { CAMERA_MODES, WARP_SPEEDS, type WarpLevel } from '../../data/missions'
import { buildSearchIndex, filterSearch } from '../../utils/discoverySearch'
import { sfxEngine } from '../../audio/sfxEngine'
import { PLANETS_BY_ID } from '../../data/planets'
import { MISSIONS_BY_ID } from '../../data/missions'
import { isMobile } from '../../utils/device'

const PHASE_LABEL: Record<string, string> = {
  idle: 'Idle',
  planning: 'Planning',
  accelerating: 'Accelerating',
  cruising: 'Cruising',
  approaching: 'Approaching',
  decelerating: 'Decelerating',
  arrived: 'Arrived',
  cancelled: 'Cancelled',
}

/**
 * Exploration chrome — glass style. pointer-events isolated from canvas.
 */
type HudProps = {
  /** Mobile bottom sheet: render inline (no fixed positioning) */
  embedded?: boolean
  /** Which cards to show; omitted = all (desktop floating HUD) */
  section?: 'explore' | 'camera'
}

export function ExplorationHUD({ embedded = false, section }: HudProps = {}) {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const selectPlanet = useSimulatorStore((s) => s.selectPlanet)

  const controlMode = useExplorationStore((s) => s.controlMode)
  const enterSpacecraft = useExplorationStore((s) => s.enterSpacecraft)
  const exitSpacecraft = useExplorationStore((s) => s.exitSpacecraft)
  const cameraMode = useExplorationStore((s) => s.cameraMode)
  const setCameraMode = useExplorationStore((s) => s.setCameraMode)
  const warpLevel = useExplorationStore((s) => s.warpLevel)
  const setWarpLevel = useExplorationStore((s) => s.setWarpLevel)
  const travelPhase = useExplorationStore((s) => s.travelPhase)
  const travelProgress = useExplorationStore((s) => s.travelProgress)
  const travelTargetId = useExplorationStore((s) => s.travelTargetId)
  const travelError = useExplorationStore((s) => s.travelError)
  const startTravel = useExplorationStore((s) => s.startTravel)
  const cancelTravel = useExplorationStore((s) => s.cancelTravel)
  const searchQuery = useExplorationStore((s) => s.searchQuery)
  const setSearchQuery = useExplorationStore((s) => s.setSearchQuery)
  const setSelectedDiscoveryId = useExplorationStore((s) => s.setSelectedDiscoveryId)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const selectedDiscoveryId = useExplorationStore((s) => s.selectedDiscoveryId)

  const [searchOpen, setSearchOpen] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const index = useMemo(() => buildSearchIndex(), [])
  const results = useMemo(() => filterSearch(searchQuery, index), [searchQuery, index])

  if (photoMode) return null

  const travelLabel = (() => {
    if (!travelTargetId) return null
    return PLANETS_BY_ID[travelTargetId]?.name || travelTargetId
  })()

  const stopUi = (e: React.SyntheticEvent) => {
    e.stopPropagation()
  }

  const onPickSearch = (id: string, travelId: string, kind: string) => {
    void sfxEngine.playSelect()
    setStatusMsg(null)
    if (kind === 'mission' || kind === 'spacecraft') {
      setSelectedDiscoveryId(id)
      const mission = MISSIONS_BY_ID[id]
      const hasSceneMarker = Boolean(mission?.parentBodyId && mission?.localOrbit)
      if (mission?.travelTargetId && PLANETS_BY_ID[mission.travelTargetId]) {
        selectPlanet(mission.travelTargetId, true)
        setStatusMsg(
          hasSceneMarker
            ? `Selected region: ${PLANETS_BY_ID[mission.travelTargetId].name}`
            : 'Mission information available — trajectory visualization pending'
        )
      } else {
        setStatusMsg('Mission information available — trajectory visualization pending')
      }
    } else if (kind === 'comet') {
      setSelectedDiscoveryId(null)
      // Comets exist in scene but travel targets a nearby planet for autopilot
      if (PLANETS_BY_ID[travelId]) {
        selectPlanet(travelId, true)
        setStatusMsg(`Comet region → focusing ${PLANETS_BY_ID[travelId].name}`)
      } else {
        setStatusMsg('Destination unavailable')
      }
    } else {
      setSelectedDiscoveryId(null)
      const bodyId = PLANETS_BY_ID[id] ? id : travelId
      if (PLANETS_BY_ID[bodyId]) {
        selectPlanet(bodyId, true)
      } else {
        setStatusMsg('Destination unavailable')
      }
    }
    setSearchQuery('')
    setSearchOpen(false)
  }

  const onTravel = () => {
    setStatusMsg(null)
    const dest = selectedPlanetId || selectedDiscoveryId
    if (!dest) {
      setStatusMsg('Select a destination first')
      return
    }
    const ok = startTravel(dest)
    if (!ok) {
      setStatusMsg(
        useExplorationStore.getState().travelError || 'Destination unavailable'
      )
    } else {
      void sfxEngine.playUiTap()
    }
  }

  const activeTravel =
    travelPhase !== 'idle' &&
    travelPhase !== 'cancelled' &&
    travelPhase !== 'arrived'

  return (
    <div
      data-asos-ui
      className={
        embedded
          ? 'flex flex-col gap-2 w-full'
          : 'fixed left-4 top-20 z-30 pointer-events-none flex flex-col gap-2 max-w-[280px]'
      }
      onPointerDown={stopUi}
      onClick={stopUi}
    >
      {section !== 'camera' && (
        <>
      <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2.5 space-y-2">
        <p className="text-[9px] tracking-[0.25em] uppercase text-space-muted">
          Exploration
        </p>
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`glass-button flex-1 py-1.5 rounded-lg text-[10px] tracking-wide ${
              controlMode === 'free' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation()
              void sfxEngine.playUiTap()
              exitSpacecraft()
            }}
          >
            Free Cam
          </button>
          <button
            type="button"
            className={`glass-button flex-1 py-1.5 rounded-lg text-[10px] tracking-wide ${
              controlMode === 'spacecraft' ? 'active' : ''
            }`}
            onClick={(e) => {
              e.stopPropagation()
              void sfxEngine.playUiTap()
              enterSpacecraft()
            }}
          >
            Spacecraft
          </button>
        </div>
        {controlMode === 'spacecraft' && (
          <p className="text-[9px] text-white/40 leading-relaxed">
            WASD move · Q/E up-down · Shift boost · Ctrl precision · Mouse look
          </p>
        )}
      </div>

      <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2.5">
        <p className="text-[9px] tracking-[0.25em] uppercase text-space-muted mb-1.5">
          Destination Search
        </p>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setSearchOpen(true)
          }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Mars, Europa, ISS, JWST…"
          className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white/90 outline-none focus:border-space-accent/40"
        />
        <AnimatePresence>
          {searchOpen && searchQuery.length > 0 && (
            <motion.ul
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-1.5 max-h-40 overflow-y-auto panel-scroll space-y-0.5"
            >
              {results.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button
                    type="button"
                    className="w-full text-left px-2 py-1.5 rounded-lg text-[11px] hover:bg-white/5 text-white/80"
                    onClick={(e) => {
                      e.stopPropagation()
                      onPickSearch(r.id, r.travelTargetId, r.kind)
                    }}
                  >
                    <span className="text-white/90">{r.name}</span>
                    <span className="block text-[9px] text-white/35 uppercase tracking-wider">
                      {r.kind} · {r.subtitle}
                    </span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="text-[10px] text-white/30 px-2 py-1">No matches</li>
              )}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2.5 space-y-2">
        <p className="text-[9px] tracking-[0.25em] uppercase text-space-muted">
          Autopilot
        </p>
        <button
          type="button"
          className="glass-button w-full py-2 rounded-xl text-[10px] tracking-[0.15em] uppercase disabled:opacity-40"
          disabled={!selectedPlanetId && !selectedDiscoveryId && !activeTravel}
          onClick={(e) => {
            e.stopPropagation()
            onTravel()
          }}
        >
          {activeTravel
            ? `${PHASE_LABEL[travelPhase] ?? travelPhase} · ${Math.round(travelProgress * 100)}%`
            : travelPhase === 'arrived'
              ? 'Arrived'
              : 'Travel'}
        </button>
        {(activeTravel || travelPhase === 'arrived') && (
          <div className="space-y-1">
            <p className="text-[10px] text-space-accent/80">
              {travelLabel} · {PHASE_LABEL[travelPhase] ?? travelPhase}
            </p>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-space-accent/70 transition-[width] duration-150"
                style={{ width: `${Math.round(travelProgress * 100)}%` }}
              />
            </div>
            {activeTravel && (
              <button
                type="button"
                className="text-[9px] text-white/40 underline"
                onClick={(e) => {
                  e.stopPropagation()
                  void sfxEngine.playUiTap()
                  cancelTravel()
                  setWarpLevel(0)
                  setStatusMsg('Autopilot cancelled')
                }}
              >
                Cancel
              </button>
            )}
          </div>
        )}
        {(statusMsg || travelError) && (
          <p className="text-[10px] text-amber-200/80 leading-snug">
            {travelError || statusMsg}
          </p>
        )}
        {/* Warp Drive is desktop-only (removed from the mobile UI) */}
        {!isMobile && (
          <>
        <p className="text-[9px] tracking-[0.2em] uppercase text-space-muted pt-1">
          Warp Drive
        </p>
        <div className="flex flex-wrap gap-1">
          {([0, 1, 5, 10, 100] as WarpLevel[]).map((w) => (
            <button
              key={w}
              type="button"
              className={`glass-button px-2 py-1 rounded-md text-[9px] ${
                warpLevel === w ? 'active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation()
                void sfxEngine.playUiTap()
                setWarpLevel(w)
              }}
            >
              {w === 0 ? 'Off' : w === 100 ? 'c' : `W${w}`}
            </button>
          ))}
        </div>
        {warpLevel > 0 && (
          <p className="text-[9px] text-white/35">
            Warp {warpLevel === 100 ? 'cinematic max' : `${warpLevel}`} · factor{' '}
            {WARP_SPEEDS[warpLevel]}
          </p>
        )}
          </>
        )}
      </div>
        </>
      )}

      {section !== 'explore' && (
      <div className="pointer-events-auto glass-panel rounded-2xl px-3 py-2.5">
        <p className="text-[9px] tracking-[0.25em] uppercase text-space-muted mb-1.5">
          Camera Mode
        </p>
        <div className="flex flex-wrap gap-1">
          {CAMERA_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              title={m.description}
              className={`glass-button px-2 py-1 rounded-md text-[9px] ${
                cameraMode === m.id ? 'active' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation()
                void sfxEngine.playUiTap()
                setCameraMode(m.id)
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      )}
    </div>
  )
}
