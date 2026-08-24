import { useEffect, useState } from 'react'
import { getLoadPhase, onLoadPhase, type LoadPhase } from '../../utils/nasaTextureLoader'
import { useSimulatorStore } from '../../store/useSimulatorStore'

const LABELS: Record<LoadPhase, string> = {
  idle: 'INITIALIZING',
  initializing: 'INITIALIZING',
  loading_planets: 'LOADING PLANETS',
  loading_nasa: 'LOADING NASA DATA',
  loading_environment: 'LOADING ENVIRONMENT',
  ready: 'READY',
}

/** Minimal load strip — non-blocking, disappears when ready */
export function LoadStatus() {
  const hasStarted = useSimulatorStore((s) => s.hasStarted)
  const [phase, setPhase] = useState<LoadPhase>(getLoadPhase())
  const [hide, setHide] = useState(false)

  useEffect(() => {
    return onLoadPhase(setPhase)
  }, [])

  useEffect(() => {
    if (phase === 'ready') {
      const t = window.setTimeout(() => setHide(true), 1200)
      return () => clearTimeout(t)
    }
  }, [phase])

  if (!hasStarted || hide || phase === 'idle') return null

  return (
    <div
      data-asos-ui
      className="fixed bottom-2 left-1/2 -translate-x-1/2 z-40 pointer-events-none"
    >
      <div className="glass-panel rounded-full px-4 py-1.5 text-[9px] tracking-[0.28em] uppercase text-white/55">
        {LABELS[phase]}
      </div>
    </div>
  )
}
