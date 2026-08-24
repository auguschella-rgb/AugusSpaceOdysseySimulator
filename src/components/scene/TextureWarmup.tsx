import { useEffect } from 'react'
import { startTexturePipeline } from '../../utils/nasaTextureLoader'
import { useTextureStore } from '../../store/useTextureStore'

/**
 * Non-blocking progressive NASA load.
 * Bumps revision as each body upgrades so materials refresh without freezes.
 */
export function TextureWarmup() {
  const bump = useTextureStore((s) => s.bump)

  useEffect(() => {
    let cancelled = false
    let pendingBump = false

    const scheduleBump = () => {
      if (cancelled || pendingBump) return
      pendingBump = true
      // Coalesce bumps to ~4/sec max — avoid remount storms
      setTimeout(() => {
        pendingBump = false
        if (!cancelled) bump()
      }, 250)
    }

    // Defer pipeline until after first paint
    const start = () => {
      if (cancelled) return
      void startTexturePipeline(() => {
        scheduleBump()
      }).then(() => {
        if (!cancelled) bump()
      })
    }

    const t = window.setTimeout(start, 80)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [bump])

  return null
}
