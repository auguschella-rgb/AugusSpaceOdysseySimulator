import { useRef } from 'react'
import { motion } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { SELECTABLE_BODIES } from '../../data/planets'
import { sfxEngine } from '../../audio/sfxEngine'

const SPEED_PRESETS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '5×', value: 5 },
  { label: '20×', value: 20 },
  { label: '100×', value: 100 },
]

export function BottomBar() {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const isPaused = useSimulatorStore((s) => s.isPaused)
  const togglePause = useSimulatorStore((s) => s.togglePause)
  const resetSimulation = useSimulatorStore((s) => s.resetSimulation)
  const simulationSpeed = useSimulatorStore((s) => s.simulationSpeed)
  const setSimulationSpeed = useSimulatorStore((s) => s.setSimulationSpeed)
  const simulationYear = useSimulatorStore((s) => s.simulationYear)
  const setSimulationYear = useSimulatorStore((s) => s.setSimulationYear)
  const activePanel = useSimulatorStore((s) => s.activePanel)
  const togglePanel = useSimulatorStore((s) => s.togglePanel)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const selectPlanet = useSimulatorStore((s) => s.selectPlanet)
  const requestCameraAction = useSimulatorStore((s) => s.requestCameraAction)
  const timelineSfxAt = useRef(0)

  if (photoMode) return null

  const selectBody = (id: string) => {
    void sfxEngine.playSelect()
    selectPlanet(id, true)
  }

  return (
    <motion.footer
      data-asos-ui
      className="fixed bottom-0 left-0 right-0 z-30 px-3 sm:px-5 pb-4 pt-2 pointer-events-none"
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex flex-col gap-3 max-w-[1600px] mx-auto">
        {/* Timeline */}
        <div className="pointer-events-auto glass-panel rounded-2xl px-4 sm:px-6 py-3 mx-auto w-full max-w-3xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] tracking-[0.25em] uppercase text-space-muted">
              Simulation Timeline
            </span>
            <span className="font-display text-sm text-space-accent tabular-nums">
              {Math.round(simulationYear)}
            </span>
          </div>
          <input
            type="range"
            min={1990}
            max={2100}
            step={1}
            value={simulationYear}
            onChange={(e) => {
              const now = performance.now()
              if (now - timelineSfxAt.current > 90) {
                void sfxEngine.playTimeline()
                timelineSfxAt.current = now
              }
              setSimulationYear(Number(e.target.value))
            }}
            className="space-slider"
            aria-label="Simulation year"
          />
          <div className="flex justify-between mt-1.5 text-[9px] tracking-wider text-white/30 tabular-nums">
            <span>1990</span>
            <span>2000</span>
            <span>2025</span>
            <span>2050</span>
            <span>2100</span>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          {/* Bottom Left — Speed & playback */}
          <div className="pointer-events-auto glass-panel rounded-2xl px-3 sm:px-4 py-3 flex flex-col gap-2.5">
            <span className="text-[9px] tracking-[0.25em] uppercase text-space-muted">
              Simulation Speed
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {SPEED_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`glass-button px-2.5 py-1 rounded-lg text-[10px] tabular-nums ${
                    simulationSpeed === p.value ? 'active' : ''
                  }`}
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    setSimulationSpeed(p.value)
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className={`glass-button px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase ${
                  isPaused ? 'active' : ''
                }`}
                onClick={() => {
                  void sfxEngine.playUiTap()
                  togglePause()
                }}
              >
                {isPaused ? 'Play' : 'Pause'}
              </button>
              <button
                type="button"
                className="glass-button px-3 py-1.5 rounded-lg text-[10px] tracking-wider uppercase"
                onClick={() => {
                  void sfxEngine.playUiTap()
                  resetSimulation()
                }}
              >
                Reset
              </button>
            </div>
          </div>

          {/* Bottom Right — Planet info + camera */}
          <div className="pointer-events-auto flex flex-col sm:flex-row gap-2">
            <div className="glass-panel rounded-2xl px-3 sm:px-4 py-3">
              <span className="text-[9px] tracking-[0.25em] uppercase text-space-muted block mb-2">
                Planet Information
              </span>
              <div className="flex flex-wrap gap-1 max-w-[280px]">
                {SELECTABLE_BODIES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`glass-button px-2 py-1 rounded-md text-[9px] tracking-wide ${
                      selectedPlanetId === p.id ? 'active' : ''
                    }`}
                    onClick={() => selectBody(p.id)}
                    style={
                      selectedPlanetId === p.id
                        ? { borderColor: p.color }
                        : undefined
                    }
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-2xl px-3 sm:px-4 py-3">
              <span className="text-[9px] tracking-[0.25em] uppercase text-space-muted block mb-2">
                Camera Controls
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  className="glass-button px-2.5 py-1.5 rounded-lg text-[10px]"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    requestCameraAction('zoomIn')
                  }}
                >
                  Zoom In
                </button>
                <button
                  type="button"
                  className="glass-button px-2.5 py-1.5 rounded-lg text-[10px]"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    requestCameraAction('zoomOut')
                  }}
                >
                  Zoom Out
                </button>
                <button
                  type="button"
                  className="glass-button px-2.5 py-1.5 rounded-lg text-[10px]"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    requestCameraAction('topView')
                  }}
                >
                  Top View
                </button>
                <button
                  type="button"
                  className="glass-button px-2.5 py-1.5 rounded-lg text-[10px]"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    requestCameraAction('reset')
                  }}
                >
                  Free Orbit
                </button>
                <button
                  type="button"
                  className={`glass-button px-2.5 py-1.5 rounded-lg text-[10px] ${
                    activePanel === 'camera' ? 'active' : ''
                  }`}
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    togglePanel('camera')
                  }}
                >
                  Tips
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
