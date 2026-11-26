import { useEffect } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { useExplorationStore } from '../../store/useExplorationStore'
import { useMobileUiStore, type MobileTab } from '../../store/useMobileUiStore'
import { ExplorationHUD } from './ExplorationHUD'
import { BottomBar } from './BottomBar'
import { sfxEngine } from '../../audio/sfxEngine'

const TABS: { id: MobileTab; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'camera', label: 'Camera' },
  { id: 'planets', label: 'Planets' },
]

/**
 * Mobile-only chrome: a round "Controls" FAB + a bottom sheet with tabs.
 * Reuses ExplorationHUD / BottomBar cards (embedded) so logic is not duplicated.
 * Nothing but the FAB / open sheet captures pointer events.
 */
export function MobileUI() {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const activePanel = useSimulatorStore((s) => s.activePanel)
  const discoveryId = useExplorationStore((s) => s.selectedDiscoveryId)
  const sheetOpen = useMobileUiStore((s) => s.sheetOpen)
  const setSheetOpen = useMobileUiStore((s) => s.setSheetOpen)
  const tab = useMobileUiStore((s) => s.tab)
  const setTab = useMobileUiStore((s) => s.setTab)
  const cardMode = useMobileUiStore((s) => s.cardMode)
  const dragControls = useDragControls()

  // Picking a body / discovery (scene tap, search, planet index) → show its card
  useEffect(() => {
    if (selectedPlanetId || discoveryId) setSheetOpen(false)
  }, [selectedPlanetId, discoveryId, setSheetOpen])
  // Opening Settings/Help/etc. also collapses the sheet
  useEffect(() => {
    if (activePanel) setSheetOpen(false)
  }, [activePanel, setSheetOpen])
  useEffect(() => {
    if (photoMode) setSheetOpen(false)
  }, [photoMode, setSheetOpen])

  if (photoMode) return null

  const openSheet = () => {
    void sfxEngine.playUiTap()
    setSheetOpen(true)
  }
  const closeSheet = () => setSheetOpen(false)

  // Compact card sits at the bottom → lift the FAB above it; hide when expanded
  const fabBottom =
    cardMode === 'compact'
      ? 'calc(env(safe-area-inset-bottom, 0px) + 10.5rem)'
      : 'calc(env(safe-area-inset-bottom, 0px) + 1rem)'

  return (
    <>
      <AnimatePresence>
        {!sheetOpen && cardMode !== 'expanded' && (
          <motion.button
            type="button"
            data-asos-ui
            className="glass-button fixed z-30 w-14 h-14 rounded-full flex flex-col items-center justify-center gap-0.5 text-[8px] tracking-[0.12em] uppercase pointer-events-auto"
            style={{
              right: 'calc(env(safe-area-inset-right, 0px) + 1rem)',
              bottom: fabBottom,
              boxShadow: '0 6px 24px rgba(0,0,0,0.5), 0 0 18px rgba(126,182,255,0.25)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              openSheet()
            }}
            aria-label="Open controls"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h10M17 15h0" />
              <circle cx="13" cy="5" r="1.8" />
              <circle cx="7" cy="10" r="1.8" />
              <circle cx="15" cy="15" r="1.8" />
            </svg>
            Controls
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheetOpen && (
          <motion.section
            data-asos-ui
            role="dialog"
            aria-label="Controls"
            className="glass-panel fixed left-0 right-0 bottom-0 z-40 rounded-t-3xl flex flex-col pointer-events-auto"
            style={{ maxHeight: '55dvh', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 500) closeSheet()
            }}
          >
            {/* Drag handle + close */}
            <div
              className="flex items-center justify-between px-4 pt-2 pb-1 shrink-0 touch-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-9" />
              <div className="w-10 h-1.5 rounded-full bg-white/25" />
              <button
                type="button"
                className="glass-button w-9 h-9 rounded-lg text-base flex items-center justify-center"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={closeSheet}
                aria-label="Close controls"
              >
                ×
              </button>
            </div>

            <div className="flex gap-1.5 px-4 pb-2 shrink-0" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={`glass-button flex-1 py-2 rounded-xl text-[11px] tracking-[0.12em] uppercase ${
                    tab === t.id ? 'active' : ''
                  }`}
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    setTab(t.id)
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="panel-scroll overflow-y-auto px-4 pb-4 min-h-0">
              {tab === 'explore' && <ExplorationHUD embedded section="explore" />}
              {tab === 'camera' && (
                <div className="flex flex-col gap-2">
                  <ExplorationHUD embedded section="camera" />
                  <BottomBar section="camera" />
                </div>
              )}
              {tab === 'planets' && <BottomBar section="planets" />}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  )
}
