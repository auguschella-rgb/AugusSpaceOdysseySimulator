import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useSimulatorStore } from '../../store/useSimulatorStore'

const DRAG_THRESHOLD_PX = 6

/**
 * Tracks pointer drag vs click so planet meshes don't steal orbit gestures.
 * Dragging always wins; click only counts when movement is tiny.
 */
export function PointerGate() {
  const { gl } = useThree()
  const setPointerDragging = useSimulatorStore((s) => s.setPointerDragging)
  const down = useRef<{ x: number; y: number } | null>(null)
  const dragged = useRef(false)

  useEffect(() => {
    const el = gl.domElement

    const onDown = (e: PointerEvent) => {
      down.current = { x: e.clientX, y: e.clientY }
      dragged.current = false
      setPointerDragging(false)
    }

    const onMove = (e: PointerEvent) => {
      if (!down.current) return
      const dx = e.clientX - down.current.x
      const dy = e.clientY - down.current.y
      if (dx * dx + dy * dy > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
        if (!dragged.current) {
          dragged.current = true
          setPointerDragging(true)
        }
      }
    }

    const onUp = () => {
      down.current = null
      // Keep dragging true until next down so late click handlers see it
      window.setTimeout(() => {
        setPointerDragging(false)
        dragged.current = false
      }, 40)
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl, setPointerDragging])

  return null
}
