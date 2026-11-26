import { useEffect, useRef } from 'react'
import { BootSequence } from './components/landing/BootSequence'
import { LandingPage } from './components/landing/LandingPage'
import { SolarSystemScene } from './components/scene/SolarSystemScene'
import { TopBar } from './components/ui/TopBar'
import { BottomBar } from './components/ui/BottomBar'
import { PlanetInfoPanel } from './components/ui/PlanetInfoPanel'
import { FloatingPanels } from './components/ui/Panels'
import { ExplorationHUD } from './components/ui/ExplorationHUD'
import { DiscoveryPanel } from './components/ui/DiscoveryPanel'
import { LoadStatus } from './components/ui/LoadStatus'
import { MobileUI } from './components/ui/MobileUI'
import { isMobile } from './utils/device'
import { useSimulatorStore } from './store/useSimulatorStore'
import { useExplorationStore } from './store/useExplorationStore'
import { musicController } from './audio/musicController'
import { sfxEngine } from './audio/sfxEngine'
import { isFullscreen, toggleFullscreen, exitFullscreen } from './utils/fullscreen'

export default function App() {
  const hasStarted = useSimulatorStore((s) => s.hasStarted)
  const setIsFullscreen = useSimulatorStore((s) => s.setIsFullscreen)
  const preferFullscreen = useSimulatorStore((s) => s.preferFullscreen)
  const setPreferFullscreen = useSimulatorStore((s) => s.setPreferFullscreen)
  const hydrateFromStorage = useSimulatorStore((s) => s.hydrateFromStorage)
  const lastDbl = useRef(0)

  // Hydrate saved preferences once
  useEffect(() => {
    hydrateFromStorage()
  }, [hydrateFromStorage])

  useEffect(() => {
    return () => {
      musicController.dispose()
      sfxEngine.dispose()
    }
  }, [])

  // Track fullscreen state
  useEffect(() => {
    const onFs = () => {
      const fs = isFullscreen()
      setIsFullscreen(fs)
      setPreferFullscreen(fs)
    }
    document.addEventListener('fullscreenchange', onFs)
    document.addEventListener('webkitfullscreenchange', onFs as EventListener)
    return () => {
      document.removeEventListener('fullscreenchange', onFs)
      document.removeEventListener('webkitfullscreenchange', onFs as EventListener)
    }
  }, [setIsFullscreen, setPreferFullscreen])

  // Restore preferred fullscreen after mission start (needs user gesture history — best effort)
  useEffect(() => {
    if (!hasStarted || !preferFullscreen) return
    // Only auto-prompt once if previously preferred
    const t = window.setTimeout(() => {
      if (!isFullscreen() && preferFullscreen) {
        // Silent — browser may block without gesture; user can press F11
      }
    }, 500)
    return () => clearTimeout(t)
  }, [hasStarted, preferFullscreen])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useSimulatorStore.getState()
      if (!state.hasStarted && e.key !== 'F11' && e.key !== 'Escape') return

      // F11 — true browser fullscreen
      if (e.key === 'F11') {
        e.preventDefault()
        void toggleFullscreen(document.documentElement).then((fs) => {
          useSimulatorStore.getState().setIsFullscreen(fs)
          useSimulatorStore.getState().setPreferFullscreen(fs)
        })
        return
      }

      if (e.key === 'Escape') {
        // ESC: photo → discovery → exploration cancel → fullscreen → panel
        if (state.photoMode) {
          state.setPhotoMode(false)
          return
        }
        const exp = useExplorationStore.getState()
        if (exp.selectedDiscoveryId) {
          exp.setSelectedDiscoveryId(null)
          return
        }
        if (exp.travelPhase !== 'idle') {
          exp.cancelTravel()
          return
        }
        if (exp.controlMode === 'spacecraft') {
          exp.exitSpacecraft()
          return
        }
        if (isFullscreen()) {
          void exitFullscreen()
          return
        }
        if (state.activePanel) {
          state.setActivePanel(null)
          return
        }
        return
      }

      if ((e.key === 'p' || e.key === 'P') && state.hasStarted) {
        state.togglePhotoMode()
      }
      if (e.key === ' ' && state.hasStarted) {
        e.preventDefault()
        state.togglePause()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Double-click empty app chrome / space (not on UI) → fullscreen
  // Canvas double-click on planet handled by mesh; this catches residual
  useEffect(() => {
    if (!hasStarted) return
    const onDbl = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('button, input, aside, header, footer, nav, .glass-panel, .glass-button')) {
        return
      }
      // Skip if a celestial body was just double-clicked
      const bodyAt = useSimulatorStore.getState().lastBodyDblClickAt
      if (performance.now() - bodyAt < 400) return
      const now = performance.now()
      if (now - lastDbl.current < 300) return
      lastDbl.current = now
      if (t.tagName === 'CANVAS' || t.id === 'root' || t === document.body) {
        void toggleFullscreen(document.documentElement).then((fs) => {
          useSimulatorStore.getState().setIsFullscreen(fs)
          useSimulatorStore.getState().setPreferFullscreen(fs)
        })
      }
    }
    // Use capture false so planet double-click can stop first if on mesh
    window.addEventListener('dblclick', onDbl)
    return () => window.removeEventListener('dblclick', onDbl)
  }, [hasStarted])

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      <BootSequence />
      <LandingPage />

      {hasStarted && (
        <>
          <SolarSystemScene />
          <TopBar />
          {isMobile ? (
            // Mobile: no floating HUD panels — Controls FAB + bottom sheet + compact cards
            <>
              <MobileUI />
              <PlanetInfoPanel />
              <DiscoveryPanel />
            </>
          ) : (
            <>
              <BottomBar />
              <PlanetInfoPanel />
              <DiscoveryPanel />
              <ExplorationHUD />
            </>
          )}
          <LoadStatus />
          <FloatingPanels />
        </>
      )}
    </div>
  )
}
