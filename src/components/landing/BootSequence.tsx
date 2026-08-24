import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'

const BOOT_LINES = [
  { text: 'INITIALIZING MISSION CONTROL...', delay: 400 },
  { text: 'Loading NASA planetary database...', delay: 1400 },
  { text: 'Calculating orbital mechanics...', delay: 2400 },
  { text: 'Initializing deep space renderer...', delay: 3400 },
  { text: 'Preparing launch...', delay: 4400 },
  { text: 'Welcome aboard, Augus.', delay: 5600, welcome: true },
] as const

export function BootSequence() {
  const bootComplete = useSimulatorStore((s) => s.bootComplete)
  const setBootComplete = useSimulatorStore((s) => s.setBootComplete)
  const [visibleCount, setVisibleCount] = useState(0)
  const [progress, setProgress] = useState(0)
  const [fadingOut, setFadingOut] = useState(false)
  const [showCursor, setShowCursor] = useState(true)

  useEffect(() => {
    if (bootComplete) return

    const lineTimers = BOOT_LINES.map((line, i) =>
      window.setTimeout(() => setVisibleCount(i + 1), line.delay)
    )

    // Progress bar fills over boot duration
    const start = performance.now()
    const duration = 6200
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(t)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    // Hold welcome, then fade to landing
    const finish = window.setTimeout(() => {
      setFadingOut(true)
      window.setTimeout(() => setBootComplete(true), 1200)
    }, 7200)

    return () => {
      lineTimers.forEach(clearTimeout)
      clearTimeout(finish)
      cancelAnimationFrame(raf)
    }
  }, [bootComplete, setBootComplete])

  // Blink cursor
  useEffect(() => {
    const id = window.setInterval(() => setShowCursor((c) => !c), 530)
    return () => clearInterval(id)
  }, [])

  return (
    <AnimatePresence>
      {!bootComplete && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: fadingOut ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Subtle scan grid */}
          <div
            className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(140,180,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(140,180,255,0.5) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* Soft radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at 50% 45%, rgba(40,70,140,0.18) 0%, transparent 55%)',
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.85) 100%)',
            }}
          />

          <div className="relative z-10 w-full max-w-lg px-8">
            {/* Header */}
            <motion.div
              className="mb-10 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2 }}
            >
              <p className="font-display text-[9px] sm:text-[10px] tracking-[0.45em] uppercase text-space-muted">
                Augus Space Odyssey Simulator · Mission Alpha 6.1
              </p>
              <div className="mt-3 mx-auto h-px w-24 bg-gradient-to-r from-transparent via-space-accent/50 to-transparent" />
            </motion.div>

            {/* Terminal lines */}
            <div className="font-mono text-[12px] sm:text-[13px] space-y-3 min-h-[200px]">
              {BOOT_LINES.map((line, i) => {
                if (i >= visibleCount) return null
                const isWelcome = 'welcome' in line && line.welcome
                const isLatest = i === visibleCount - 1

                return (
                  <motion.div
                    key={line.text}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    className={
                      isWelcome
                        ? 'pt-4 mt-2 border-t border-white/5'
                        : ''
                    }
                  >
                    {!isWelcome && (
                      <span className="text-space-accent/50 mr-2 select-none">›</span>
                    )}
                    <span
                      className={
                        isWelcome
                          ? 'font-display text-base sm:text-lg tracking-[0.12em] text-white text-glow'
                          : 'text-white/70 tracking-wide'
                      }
                    >
                      {line.text}
                    </span>
                    {isLatest && !isWelcome && (
                      <span
                        className="inline-block w-[7px] h-[13px] ml-1 align-middle bg-space-accent/70"
                        style={{ opacity: showCursor ? 1 : 0 }}
                      />
                    )}
                    {isWelcome && isLatest && (
                      <motion.span
                        className="block mt-2 text-[10px] tracking-[0.3em] uppercase text-space-gold/70"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.8 }}
                      >
                        Journey Beyond Reality
                      </motion.span>
                    )}
                  </motion.div>
                )
              })}
            </div>

            {/* Progress */}
            <div className="mt-12">
              <div className="flex justify-between mb-2 text-[9px] tracking-[0.25em] uppercase text-white/30">
                <span>System Status</span>
                <span className="tabular-nums text-space-accent/60">
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-[2px] w-full rounded-full bg-white/5 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%`,
                    background:
                      'linear-gradient(90deg, rgba(80,120,200,0.4), rgba(160,200,255,0.85))',
                    boxShadow: '0 0 12px rgba(120,180,255,0.45)',
                  }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
