import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { musicController } from '../../audio/musicController'
import { sfxEngine } from '../../audio/sfxEngine'

export function LandingPage() {
  const bootComplete = useSimulatorStore((s) => s.bootComplete)
  const hasStarted = useSimulatorStore((s) => s.hasStarted)
  const setHasStarted = useSimulatorStore((s) => s.setHasStarted)
  const setMusicEnabled = useSimulatorStore((s) => s.setMusicEnabled)
  const [phase, setPhase] = useState(0) // 0 black, 1 stars, 2 sun, 3 text, 4 ready

  // Start landing animation only after boot sequence finishes
  useEffect(() => {
    if (!bootComplete) return
    setPhase(0)
    const timers = [
      window.setTimeout(() => setPhase(1), 400),
      window.setTimeout(() => setPhase(2), 1400),
      window.setTimeout(() => setPhase(3), 2800),
      window.setTimeout(() => setPhase(4), 3800),
    ]
    return () => timers.forEach(clearTimeout)
  }, [bootComplete])

  const stars = useMemo(
    () =>
      Array.from({ length: 120 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
      })),
    []
  )

  const handleBegin = () => {
    // Enter the sim immediately — never wait on audio startup (mobile can stall).
    setHasStarted(true)
    setMusicEnabled(true)
    const { musicStyle, musicVolume } = useSimulatorStore.getState()
    musicController.setVolume(musicVolume)
    musicController.toggle(true, musicStyle)
    void sfxEngine.startHum()
    void sfxEngine.playUiTap()
  }

  if (!bootComplete) return null

  return (
    <AnimatePresence>
      {!hasStarted && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          exit={{ opacity: 0, transition: { duration: 1.4, ease: [0.22, 1, 0.36, 1] } }}
        >
          {/* Stars */}
          <div className="absolute inset-0">
            {stars.map((s) => (
              <motion.span
                key={s.id}
                className="absolute rounded-full bg-white"
                style={{
                  left: s.left,
                  top: s.top,
                  width: s.size,
                  height: s.size,
                }}
                initial={{ opacity: 0 }}
                animate={
                  phase >= 1
                    ? {
                        opacity: [0.15, 0.85, 0.3, 0.7],
                        transition: {
                          delay: s.delay,
                          duration: s.duration,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        },
                      }
                    : { opacity: 0 }
                }
              />
            ))}
          </div>

          {/* Rising Sun glow */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
            initial={{ opacity: 0, y: 120 }}
            animate={
              phase >= 2
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 120 }
            }
            transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="w-[min(90vw,520px)] h-[min(90vw,520px)] rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 50% 55%, rgba(255,230,160,0.95) 0%, rgba(255,160,50,0.55) 28%, rgba(255,100,20,0.15) 50%, transparent 70%)',
                filter: 'blur(2px)',
                boxShadow: '0 0 120px 40px rgba(255,160,60,0.25)',
              }}
            />
            {/* Horizon haze */}
            <div
              className="absolute left-1/2 -translate-x-1/2 bottom-[30%] w-[140%] h-40"
              style={{
                background:
                  'linear-gradient(to top, rgba(255,140,40,0.15), transparent)',
                filter: 'blur(20px)',
              }}
            />
          </motion.div>

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.75) 100%)',
            }}
          />

          {/* Title block */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            <motion.p
              className="font-display text-[10px] sm:text-xs tracking-[0.45em] uppercase text-space-muted mb-6"
              initial={{ opacity: 0, y: 12 }}
              animate={phase >= 3 ? { opacity: 0.7, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            >
              Mission Alpha · Version 1
            </motion.p>

            <motion.h1
              className="font-display text-3xl sm:text-5xl md:text-6xl font-semibold tracking-[0.08em] text-glow text-white max-w-4xl"
              initial={{ opacity: 0, y: 24 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            >
              Augus Space Odyssey Simulator
            </motion.h1>

            <motion.p
              className="mt-5 text-sm sm:text-lg tracking-[0.28em] uppercase text-space-gold/90 text-glow-soft"
              initial={{ opacity: 0, y: 16 }}
              animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 1.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              Journey Beyond Reality
            </motion.p>

            <motion.button
              type="button"
              onClick={handleBegin}
              className="glow-cta mt-12 sm:mt-16 px-10 py-4 rounded-full text-xs sm:text-sm font-medium relative z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={
                phase >= 4
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 20, pointerEvents: 'none' as const }
              }
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              Begin Exploration
            </motion.button>

            <motion.p
              className="mt-8 text-[10px] tracking-[0.25em] uppercase text-white/30"
              initial={{ opacity: 0 }}
              animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: 1.2, delay: 0.3 }}
            >
              Solar System Explorer
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
