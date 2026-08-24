import { motion, AnimatePresence } from 'framer-motion'
import { useExplorationStore } from '../../store/useExplorationStore'
import { MISSIONS_BY_ID } from '../../data/missions'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { sfxEngine } from '../../audio/sfxEngine'

/**
 * Mission / probe discovery dossier — complements PlanetInfoPanel.
 */
export function DiscoveryPanel() {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const id = useExplorationStore((s) => s.selectedDiscoveryId)
  const setId = useExplorationStore((s) => s.setSelectedDiscoveryId)
  const startTravel = useExplorationStore((s) => s.startTravel)
  const entry = id ? MISSIONS_BY_ID[id] : null

  if (photoMode || !entry) return null

  return (
    <AnimatePresence>
      <motion.aside
        data-asos-ui
        className="glass-panel fixed top-20 right-4 z-30 w-[min(100vw-2rem,340px)] max-h-[calc(100vh-10rem)] rounded-2xl overflow-hidden flex flex-col"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-white/5">
          <div>
            <p className="text-[9px] tracking-[0.3em] uppercase text-space-muted mb-1">
              Discovery · {entry.kind}
            </p>
            <h2 className="font-display text-lg tracking-wide text-white text-glow-soft">
              {entry.name}
            </h2>
          </div>
          <button
            type="button"
            className="glass-button w-8 h-8 rounded-lg text-sm flex items-center justify-center shrink-0"
            onClick={() => {
              void sfxEngine.playUiTap()
              setId(null)
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="panel-scroll overflow-y-auto px-5 py-4 space-y-3 text-[12px]">
          <div
            className="h-1 w-16 rounded-full"
            style={{ background: `linear-gradient(90deg, ${entry.color}, transparent)` }}
          />

          <dl className="space-y-2">
            {(
              [
                ['Mission', entry.mission],
                ['Launch', entry.launchDate],
                ['Status', entry.status],
                ['Current Target', entry.currentTarget],
                ['Mass', entry.mass],
                ['Diameter / Size', entry.diameter],
                ['Temperature', entry.temperature],
                ['Gravity', entry.gravity],
                ['Discovery', entry.discovery],
              ] as const
            ).map(([label, value]) =>
              value ? (
                <div key={label}>
                  <dt className="text-[9px] tracking-[0.2em] uppercase text-space-muted">
                    {label}
                  </dt>
                  <dd className="text-white/85 leading-snug">{value}</dd>
                </div>
              ) : null
            )}
          </dl>

          {entry.history && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[9px] tracking-[0.25em] uppercase text-space-gold/80 mb-1">
                History
              </p>
              <p className="text-[11px] text-white/65 leading-relaxed">{entry.history}</p>
            </div>
          )}

          <div className="pt-2 border-t border-white/5">
            <p className="text-[9px] tracking-[0.25em] uppercase text-space-gold/80 mb-2">
              NASA Notes
            </p>
            <ul className="space-y-2">
              {entry.facts.map((f) => (
                <li
                  key={f}
                  className="text-[11px] leading-relaxed text-white/70 pl-3 border-l border-space-accent/30"
                >
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {entry.travelTargetId ? (
            <button
              type="button"
              className="glass-button w-full py-2 rounded-xl text-[10px] tracking-[0.15em] uppercase mt-2"
              onClick={() => {
                void sfxEngine.playUiTap()
                startTravel(entry.travelTargetId!)
              }}
            >
              Travel to region
            </button>
          ) : (
            <p className="text-[10px] text-amber-200/70 mt-2 leading-snug">
              Mission information available — trajectory visualization pending
            </p>
          )}
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}
