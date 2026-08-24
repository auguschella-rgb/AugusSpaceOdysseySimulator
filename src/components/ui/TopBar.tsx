import { motion } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { sfxEngine } from '../../audio/sfxEngine'

const NAV = [
  { id: 'settings' as const, label: 'Settings' },
  { id: 'music' as const, label: 'Music' },
  { id: 'help' as const, label: 'Help' },
  { id: 'about' as const, label: 'About' },
]

export function TopBar() {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const activePanel = useSimulatorStore((s) => s.activePanel)
  const togglePanel = useSimulatorStore((s) => s.togglePanel)
  const togglePhotoMode = useSimulatorStore((s) => s.togglePhotoMode)

  if (photoMode) {
    return (
      <motion.button
        type="button"
        data-asos-ui
        className="fixed top-4 right-4 z-40 glass-button px-4 py-2 rounded-full text-[10px] tracking-[0.2em] uppercase"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          void sfxEngine.playUiTap()
          togglePhotoMode()
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.7 }}
        whileHover={{ opacity: 1 }}
      >
        Exit Photo Mode
      </motion.button>
    )
  }

  return (
    <motion.header
      data-asos-ui
      className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 py-4 pointer-events-none"
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Logo */}
      <div className="pointer-events-auto flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, #fff5d6, #ffb347 50%, #e07020)',
            boxShadow: '0 0 20px rgba(255,160,60,0.4)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white/90" />
        </div>
        <div className="hidden sm:block">
          <p className="font-display text-sm tracking-wide text-white text-glow-soft">
            Augus Space Odyssey Simulator
          </p>
          <p className="text-[9px] tracking-[0.28em] uppercase text-space-muted mt-0.5">
            Journey Beyond Reality
          </p>
        </div>
        <p className="sm:hidden font-display text-xs tracking-wide text-white">
          ASOS
        </p>
      </div>

      {/* Nav */}
      <nav className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`glass-button px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] tracking-[0.12em] uppercase ${
              activePanel === item.id ? 'active' : ''
            }`}
            onClick={() => {
              void sfxEngine.playUiTap()
              togglePanel(item.id)
            }}
          >
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="glass-button px-2.5 sm:px-3.5 py-1.5 rounded-full text-[10px] sm:text-[11px] tracking-[0.12em] uppercase ml-1"
          onClick={() => {
            void sfxEngine.playUiTap()
            togglePhotoMode()
          }}
          title="Hide UI for screenshots"
        >
          Photo
        </button>
      </nav>
    </motion.header>
  )
}
