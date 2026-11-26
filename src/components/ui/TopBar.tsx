import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { sfxEngine } from '../../audio/sfxEngine'
import { isMobile } from '../../utils/device'
import { enterImmersive } from '../../utils/immersive'

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
  const [menuOpen, setMenuOpen] = useState(false)

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
        <div className={isMobile ? 'hidden' : 'hidden sm:block'}>
          <p className="font-display text-sm tracking-wide text-white text-glow-soft">
            Augus Space Odyssey Simulator
          </p>
          <p className="text-[9px] tracking-[0.28em] uppercase text-space-muted mt-0.5">
            Journey Beyond Reality
          </p>
        </div>
        <p className={isMobile ? 'font-display text-xs tracking-wide text-white' : 'sm:hidden font-display text-xs tracking-wide text-white'}>
          ASOS
        </p>
      </div>

      {/* Mobile: labeled Full screen control + menu (portrait and landscape) */}
      {isMobile && (
        <div className="pointer-events-auto relative flex items-center gap-1.5">
          <button
            type="button"
            className="glass-button h-10 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 shrink-0"
            style={{ borderColor: 'rgba(160, 200, 255, 0.45)' }}
            aria-label="Enter fullscreen"
            title="Full screen"
            onClick={() => {
              void sfxEngine.playUiTap()
              setMenuOpen(false)
              void enterImmersive()
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
            </svg>
            <span className="text-[9px] tracking-[0.12em] uppercase whitespace-nowrap">Full screen</span>
          </button>
          <button
            type="button"
            className={`glass-button w-10 h-10 rounded-full flex items-center justify-center ${
              menuOpen ? 'active' : ''
            }`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => {
              void sfxEngine.playUiTap()
              setMenuOpen((v) => !v)
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 5h12M3 9h12M3 13h12" />
            </svg>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="glass-panel absolute right-0 top-12 w-44 rounded-2xl p-2 flex flex-col gap-1"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  className="glass-button px-3 py-2.5 rounded-xl text-[11px] tracking-[0.12em] uppercase text-left flex items-center gap-2"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    setMenuOpen(false)
                    void enterImmersive()
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
                  </svg>
                  Full screen
                </button>
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`glass-button px-3 py-2.5 rounded-xl text-[11px] tracking-[0.12em] uppercase text-left ${
                      activePanel === item.id ? 'active' : ''
                    }`}
                    onClick={() => {
                      void sfxEngine.playUiTap()
                      setMenuOpen(false)
                      togglePanel(item.id)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="glass-button px-3 py-2.5 rounded-xl text-[11px] tracking-[0.12em] uppercase text-left"
                  onClick={() => {
                    void sfxEngine.playUiTap()
                    setMenuOpen(false)
                    togglePhotoMode()
                  }}
                >
                  Photo
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Nav (desktop) */}
      {!isMobile && (
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
      )}
    </motion.header>
  )
}
