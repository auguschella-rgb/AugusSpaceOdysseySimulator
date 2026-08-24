import { createContext, useContext, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useSimulatorStore } from '../../store/useSimulatorStore'

interface ClockContextValue {
  /** Simulated days elapsed since play started (mutable ref) */
  animDays: React.MutableRefObject<number>
}

const SimulationClockContext = createContext<ClockContextValue | null>(null)

export function SimulationClockProvider({ children }: { children: ReactNode }) {
  const animDays = useRef(0)
  const isPaused = useSimulatorStore((s) => s.isPaused)
  const simulationSpeed = useSimulatorStore((s) => s.simulationSpeed)
  const setLiveAnimDays = useSimulatorStore((s) => s.setLiveAnimDays)
  const syncAccum = useRef(0)

  useFrame((_, delta) => {
    if (!isPaused) {
      // Baseline: speed 1 ≈ ~12 simulated days per real second
      animDays.current += delta * simulationSpeed * 12
    }
    // Throttle store sync for live info panel (~4 Hz)
    syncAccum.current += delta
    if (syncAccum.current > 0.25) {
      syncAccum.current = 0
      setLiveAnimDays(animDays.current)
    }
  })

  return (
    <SimulationClockContext.Provider value={{ animDays }}>
      {children}
    </SimulationClockContext.Provider>
  )
}

export function useSimulationClock() {
  const ctx = useContext(SimulationClockContext)
  if (!ctx) throw new Error('useSimulationClock must be used within SimulationClockProvider')
  return ctx
}
