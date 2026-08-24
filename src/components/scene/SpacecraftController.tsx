import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExplorationStore } from '../../store/useExplorationStore'
import { WARP_SPEEDS } from '../../data/missions'
import { ambientEngine } from '../../audio/ambientEngine'
import { useSimulatorStore } from '../../store/useSimulatorStore'

const LOOK_SENS = 0.0018
const BASE_ACCEL = 4.5
const MAX_SPEED = 28
const DRAG = 1.8
const PRECISION = 0.28
const BOOST = 2.4

function isUiTarget(t: EventTarget | null): boolean {
  if (!t || !(t instanceof HTMLElement)) return false
  return Boolean(
    t.closest(
      'button, input, textarea, select, a, .glass-panel, .glass-button, [data-asos-ui]'
    )
  )
}

/**
 * Heavy cinematic spacecraft pilot mode.
 * Keys ignored while focus is on UI. OrbitControls disabled by CameraController.
 */
export function SpacecraftController() {
  const { camera, gl } = useThree()
  const controlMode = useExplorationStore((s) => s.controlMode)
  const cameraMode = useExplorationStore((s) => s.cameraMode)
  const warpLevel = useExplorationStore((s) => s.warpLevel)
  const travelPhase = useExplorationStore((s) => s.travelPhase)
  const musicEnabled = useSimulatorStore((s) => s.musicEnabled)

  const keys = useRef<Record<string, boolean>>({})
  const velocity = useRef(new THREE.Vector3())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  const shake = useRef(0)

  useEffect(() => {
    if (controlMode !== 'spacecraft') {
      velocity.current.set(0, 0, 0)
      keys.current = {}
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock?.()
      }
      return
    }

    euler.current.setFromQuaternion(camera.quaternion)

    const onKeyDown = (e: KeyboardEvent) => {
      if (isUiTarget(e.target)) return
      keys.current[e.code] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false
    }

    const onMouseMove = (e: MouseEvent) => {
      if (isUiTarget(e.target) && document.pointerLockElement !== gl.domElement) return
      if (document.pointerLockElement === gl.domElement || e.buttons === 1) {
        // Ignore look if pressing over UI without lock
        if (e.buttons === 1 && isUiTarget(e.target)) return
        euler.current.y -= e.movementX * LOOK_SENS
        euler.current.x -= e.movementY * LOOK_SENS
        euler.current.x = Math.max(
          -Math.PI / 2 + 0.05,
          Math.min(Math.PI / 2 - 0.05, euler.current.x)
        )
      }
    }

    const onClick = (e: MouseEvent) => {
      if (isUiTarget(e.target)) return
      if (document.pointerLockElement !== gl.domElement) {
        gl.domElement.requestPointerLock?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    gl.domElement.addEventListener('click', onClick)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      gl.domElement.removeEventListener('click', onClick)
      if (document.pointerLockElement === gl.domElement) {
        document.exitPointerLock?.()
      }
    }
  }, [controlMode, camera, gl])

  useFrame((_, delta) => {
    if (controlMode !== 'spacecraft') return
    // Autopilot owns motion during active travel
    if (
      travelPhase !== 'idle' &&
      travelPhase !== 'arrived' &&
      travelPhase !== 'cancelled'
    ) {
      return
    }

    const d = Math.min(delta, 0.05)
    camera.quaternion.setFromEuler(euler.current)

    let modeMul = 1
    if (cameraMode === 'documentary') modeMul = 0.55
    else if (cameraMode === 'drone') modeMul = 1.35
    else if (cameraMode === 'imax') modeMul = 0.85
    else if (cameraMode === 'orbit') modeMul = 0.7
    else if (cameraMode === 'pilot') modeMul = 1

    if (camera instanceof THREE.PerspectiveCamera) {
      const targetFov =
        cameraMode === 'pilot' ? 55 : cameraMode === 'imax' ? 58 : 42
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-d * 1.5))
      camera.updateProjectionMatrix()
    }

    const boost = keys.current['ShiftLeft'] || keys.current['ShiftRight']
    const precise = keys.current['ControlLeft'] || keys.current['ControlRight']
    let accel = BASE_ACCEL * modeMul
    if (boost) accel *= BOOST
    if (precise) accel *= PRECISION

    const warpBoost = WARP_SPEEDS[warpLevel] || 0
    if (warpBoost > 0) {
      accel += warpBoost * 0.8
      // Auto-thrust forward while warping without keys
      const forwardW = new THREE.Vector3()
      camera.getWorldDirection(forwardW)
      velocity.current.addScaledVector(forwardW, warpBoost * 0.15 * d)
      shake.current = Math.min(1, shake.current + d * 0.8)
    } else {
      shake.current = Math.max(0, shake.current - d * 1.5)
    }

    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward)
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize()
    const up = camera.up.clone().normalize()

    const wish = new THREE.Vector3()
    if (keys.current['KeyW']) wish.add(forward)
    if (keys.current['KeyS']) wish.sub(forward)
    if (keys.current['KeyD']) wish.add(right)
    if (keys.current['KeyA']) wish.sub(right)
    if (keys.current['KeyE']) wish.add(up)
    if (keys.current['KeyQ']) wish.sub(up)

    if (wish.lengthSq() > 0) {
      wish.normalize().multiplyScalar(accel * d)
      velocity.current.add(wish)
    }

    velocity.current.multiplyScalar(Math.exp(-DRAG * d * (precise ? 1.6 : 1)))
    const maxSp = MAX_SPEED * modeMul + warpBoost
    if (velocity.current.length() > maxSp) {
      velocity.current.setLength(maxSp)
    }

    camera.position.addScaledVector(velocity.current, d)

    if (shake.current > 0.01) {
      const s = shake.current * 0.012 * (warpLevel === 100 ? 1.4 : 1)
      camera.position.x += (Math.random() - 0.5) * s
      camera.position.y += (Math.random() - 0.5) * s
    }

    if (musicEnabled) {
      ambientEngine.setAtmosphere(camera.position.length(), null)
      const wi = warpLevel === 100 ? 1 : warpLevel > 0 ? Math.min(1, warpLevel / 10) : 0
      ambientEngine.setWarpIntensity(wi)
    }
  })

  return null
}
