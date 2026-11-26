import { motion, AnimatePresence } from 'framer-motion'
import { useMobileUiStore } from '../../store/useMobileUiStore'
import { dismissHomeScreenTip, exitImmersive } from '../../utils/immersive'
import { sfxEngine } from '../../audio/sfxEngine'

/**
 * Shown only while mobile immersive mode is on: a tiny minimize control plus
 * (first time on iOS Safari, not already a Home Screen app) a dismissible tip.
 */
export function ImmersiveChrome() {
  const showTip = useMobileUiStore((s) => s.showHomeScreenTip)

  return (
    <>
      <button
        type="button"
        data-asos-ui
        className="fixed z-50 w-9 h-9 rounded-full flex items-center justify-center text-white/80 pointer-events-auto"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)',
          right: 'calc(env(safe-area-inset-right, 0px) + 0.5rem)',
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.22)',
          backdropFilter: 'blur(8px)',
        }}
        aria-label="Exit fullscreen"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation()
          void sfxEngine.playUiTap()
          void exitImmersive()
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 2v3H2M11 2v3h3M2 11h3v3M11 11h3v3" />
          <path d="M5 5 2 2M11 5l3-3M5 11 2 14M11 11l3 3" />
        </svg>
      </button>

      <AnimatePresence>
        {showTip && (
          <motion.div
            data-asos-ui
            className="fixed left-3 right-3 z-50 pointer-events-auto"
            style={{
              bottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)',
            }}
            onPointerDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
          >
            <div
              className="flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[11px] leading-snug text-white/85"
              style={{
                background: 'rgba(0, 0, 0, 0.62)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <p className="flex-1 pt-0.5">
                For true full screen on iPhone: Share → Add to Home Screen
              </p>
              <button
                type="button"
                className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white/70"
                style={{ background: 'rgba(255,255,255,0.08)' }}
                aria-label="Dismiss tip"
                onClick={() => {
                  void sfxEngine.playUiTap()
                  dismissHomeScreenTip()
                }}
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
