import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { isMobile } from '../../utils/device'

/**
 * Photo Mode must NOT change scene lighting, sky, or post pipeline structure.
 * Only: higher pixel ratio for cleaner screenshots + anisotropy hint.
 * UI hide is handled by React HUD components.
 */
export function PhotoModeEnhancer() {
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const { gl } = useThree()

  useEffect(() => {
    if (isMobile) {
      // Mobile: render at the screen's real sharpness (capped at 2x; 2.5x in Photo Mode)
      const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)
      gl.setPixelRatio(photoMode ? Math.min(dpr * 1.25, 2.5) : dpr)
      return
    }
    const max = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 2)
    if (photoMode) {
      // Slightly higher resolution for screenshots — no clear color / tone mapping change
      gl.setPixelRatio(Math.min(max * 1.35, 2.5))
    } else {
      gl.setPixelRatio(Math.min(max, 1.5))
    }
    // Never touch clear color or tone mapping here
  }, [photoMode, gl])

  return null
}
