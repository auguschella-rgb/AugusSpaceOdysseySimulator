import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { useExplorationStore } from '../../store/useExplorationStore'
import { PLANETS_BY_ID } from '../../data/planets'
import { isMobile } from '../../utils/device'
import { useMobileUiStore } from '../../store/useMobileUiStore'
import { MobileBottomCard } from './MobileBottomCard'
import {
  getOrbitalSpeedKmS,
  getDistanceAu,
  getSimulationDate,
  getLocalTimeHours,
  getRotationAngle,
} from '../../utils/orbital'

function formatHours(h: number) {
  const hh = Math.floor(h)
  const mm = Math.floor((h - hh) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

export function PlanetInfoPanel() {
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const setSelectedPlanetId = useSimulatorStore((s) => s.setSelectedPlanetId)
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const year = useSimulatorStore((s) => s.simulationYear)
  const isPaused = useSimulatorStore((s) => s.isPaused)
  // Live clock from scene if available (panel is outside Canvas — use store-synced anim)
  const animDaysStore = useSimulatorStore((s) => s.liveAnimDays)
  const discoveryOpen = useExplorationStore((s) => s.selectedDiscoveryId)
  const sheetOpen = useMobileUiStore((s) => s.sheetOpen)

  const planet =
    selectedPlanetId && !discoveryOpen ? PLANETS_BY_ID[selectedPlanetId] : null

  const live = useMemo(() => {
    if (!planet) return null
    const animDays = animDaysStore
    const speed =
      planet.meanOrbitalSpeedKmS ?? getOrbitalSpeedKmS(planet, year, animDays)
    // Scale speed by current ellipse position vs mean
    const liveSpeed = getOrbitalSpeedKmS(planet, year, animDays) || speed
    const distAu = getDistanceAu(planet, year, animDays, PLANETS_BY_ID)
    const date = getSimulationDate(year, animDays)
    const localH = getLocalTimeHours(planet, year, animDays)
    const rotDeg = ((getRotationAngle(planet, year, animDays) * 180) / Math.PI).toFixed(1)
    return {
      orbitalSpeed: `${liveSpeed.toFixed(2)} km/s`,
      rotationPeriod: planet.info.lengthOfDay,
      distanceAu: planet.id === 'sun' ? '—' : `${distAu.toFixed(3)} AU`,
      simDate: date.toISOString().slice(0, 10),
      localTime: formatHours(localH),
      rotationAngle: `${rotDeg}°`,
      paused: isPaused,
    }
  }, [planet, year, animDaysStore, isPaused])

  if (photoMode) return null

  const details = planet ? (
    <>
            <div
              className="h-1 w-16 rounded-full"
              style={{
                background: `linear-gradient(90deg, ${planet.color}, transparent)`,
              }}
            />

            {/* Live telemetry */}
            {live && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 space-y-2">
                <p className="text-[9px] tracking-[0.25em] uppercase text-space-gold/80">
                  Live Telemetry
                </p>
                <dl className="space-y-1.5 text-[11px]">
                  {(
                    [
                      ['Orbital Speed', live.orbitalSpeed],
                      ['Rotation Period', live.rotationPeriod],
                      ['Distance from Sun', live.distanceAu],
                      ['Simulation Date', live.simDate],
                      ['Local Solar Time', live.localTime],
                      ['Rotation Phase', live.rotationAngle],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-white/40">{label}</dt>
                      <dd className="text-white/90 tabular-nums text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <dl className="space-y-2.5 text-[12px]">
              {(
                [
                  ['Radius', planet.info.radiusKm],
                  ['Diameter', planet.info.diameterKm],
                  ['Gravity', planet.info.gravity],
                  ['Avg. Temperature', planet.info.avgTemp],
                  ['Atmosphere', planet.info.atmosphere],
                  ['Length of Day', planet.info.lengthOfDay],
                  ['Length of Year', planet.info.lengthOfYear],
                  ['Moons', planet.info.moons],
                  ['Distance from Sun', planet.info.distanceFromSun],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-[9px] tracking-[0.2em] uppercase text-space-muted">
                    {label}
                  </dt>
                  <dd className="text-white/90 leading-snug">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="pt-2 border-t border-white/5">
              <p className="text-[9px] tracking-[0.25em] uppercase text-space-gold/80 mb-2">
                Scientific Notes
              </p>
              <ul className="space-y-2">
                {planet.info.facts.map((fact) => (
                  <li
                    key={fact}
                    className="text-[11px] leading-relaxed text-white/70 pl-3 border-l border-space-accent/30"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            </div>
    </>
  ) : null

  if (isMobile) {
    const stat = (label: string, value: string) => ({ label, value })
    return (
      <AnimatePresence>
        {planet && !sheetOpen && (
          <MobileBottomCard
            key={planet.id}
            kicker="Celestial Body"
            title={planet.name}
            accent={planet.color}
            stats={[
              stat('Radius', planet.info.radiusKm),
              stat('Gravity', planet.info.gravity),
              stat('Avg. Temp', planet.info.avgTemp),
            ]}
            onClose={() => setSelectedPlanetId(null)}
          >
            {details}
          </MobileBottomCard>
        )}
      </AnimatePresence>
    )
  }

  return (
    <AnimatePresence>
      {planet && (
        <motion.aside
          data-asos-ui
          className="glass-panel fixed top-20 right-4 z-30 w-[min(100vw-2rem,340px)] max-h-[calc(100vh-10rem)] rounded-2xl overflow-hidden flex flex-col"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/5">
            <div>
              <p className="text-[9px] tracking-[0.3em] uppercase text-space-muted mb-1">
                Celestial Body
              </p>
              <h2 className="font-display text-xl tracking-wide text-white text-glow-soft">
                {planet.name}
              </h2>
            </div>
            <button
              type="button"
              className="glass-button w-8 h-8 rounded-lg text-sm flex items-center justify-center shrink-0"
              onClick={() => setSelectedPlanetId(null)}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          <div className="panel-scroll overflow-y-auto px-5 py-4 space-y-4">
            {details}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
