import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { PLANETS_BY_ID } from '../../data/planets'
import { getBodyWorldPosition } from '../../utils/orbital'
import { useSimulationClock } from './SimulationClock'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { ambientEngine } from '../../audio/ambientEngine'
import { useExplorationStore } from '../../store/useExplorationStore'

/**
 * Camera controls — experience polish only.
 * Left = rotate · Middle = pan · Right = free rotate · Wheel = smooth zoom
 * Focused planet stays locked; minDistance prevents mesh clipping.
 */
export function CameraController() {
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const { camera, gl } = useThree()
  const { animDays } = useSimulationClock()

  const focusPlanetId = useSimulatorStore((s) => s.focusPlanetId)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const cameraFlying = useSimulatorStore((s) => s.cameraFlying)
  const setCameraFlying = useSimulatorStore((s) => s.setCameraFlying)
  const year = useSimulatorStore((s) => s.simulationYear)
  const cameraAction = useSimulatorStore((s) => s.cameraAction)
  const clearCameraAction = useSimulatorStore((s) => s.clearCameraAction)
  const setFocusPlanetId = useSimulatorStore((s) => s.setFocusPlanetId)
  const musicEnabled = useSimulatorStore((s) => s.musicEnabled)
  const cinematicMode = useSimulatorStore((s) => s.cinematicMode)
  const setSavedCameraDistance = useSimulatorStore((s) => s.setSavedCameraDistance)
  const setSavedCameraY = useSimulatorStore((s) => s.setSavedCameraY)
  const savedCameraDistance = useSimulatorStore((s) => s.savedCameraDistance)
  const savedCameraY = useSimulatorStore((s) => s.savedCameraY)
  const hasStarted = useSimulatorStore((s) => s.hasStarted)
  const controlMode = useExplorationStore((s) => s.controlMode)
  const cameraMode = useExplorationStore((s) => s.cameraMode)
  const travelPhase = useExplorationStore((s) => s.travelPhase)

  const flyTarget = useRef(new THREE.Vector3())
  const flyPosition = useRef(new THREE.Vector3())
  const flying = useRef(false)
  const startPos = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const flyT = useRef(0)
  const vel = useRef(new THREE.Vector3())
  const lastPos = useRef(new THREE.Vector3(0, 38, 85))
  const cinePhase = useRef(0)
  const restored = useRef(false)
  const persistTimer = useRef(0)

  const beginFly = (target: THREE.Vector3, position: THREE.Vector3) => {
    const controls = controlsRef.current
    if (!controls) return
    startPos.current.copy(camera.position)
    startTarget.current.copy(controls.target)
    flyTarget.current.copy(target)
    flyPosition.current.copy(position)
    flyT.current = 0
    flying.current = true
    controls.enabled = false
    vel.current.set(0, 0, 0)
  }

  // Restore camera distance once after start
  useEffect(() => {
    if (!hasStarted || restored.current || !controlsRef.current) return
    const d = savedCameraDistance
    const y = savedCameraY
    if (d > 5 && d < 240) {
      const dir = camera.position.clone().normalize()
      if (dir.lengthSq() < 0.01) dir.set(0, 0.4, 1).normalize()
      camera.position.copy(dir.multiplyScalar(d))
      camera.position.y = y
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
    restored.current = true
  }, [hasStarted, savedCameraDistance, savedCameraY, camera])

  // Intentional fly-to when focus + flying requested
  useEffect(() => {
    if (!focusPlanetId || !cameraFlying || !controlsRef.current) return
    const data = PLANETS_BY_ID[focusPlanetId]
    if (!data) return

    const pos = getBodyPosition(focusPlanetId, year, animDays.current)
    const distance = Math.max(data.radius * (cinematicMode ? 12 : 10), 4.5)
    const offset = camera.position.clone().sub(pos)
    if (offset.lengthSq() < 0.01) offset.set(1.2, 0.5, 1.8)
    offset.normalize().multiplyScalar(distance)
    const dest = pos.clone().add(offset)
    dest.y += data.radius * 0.45
    beginFly(pos, dest)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusPlanetId, cameraFlying])

  useEffect(() => {
    if (cameraAction === 'none' || !controlsRef.current) return

    if (cameraAction === 'reset') {
      setFocusPlanetId(null)
      beginFly(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 38, 85))
      setCameraFlying(true)
    } else if (cameraAction === 'zoomIn') {
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      vel.current.addScaledVector(dir, cinematicMode ? 3.2 : 4.5)
    } else if (cameraAction === 'zoomOut') {
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      vel.current.addScaledVector(dir, cinematicMode ? -3.2 : -4.5)
    } else if (cameraAction === 'topView') {
      beginFly(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 130, 1))
      setCameraFlying(true)
    } else if (cameraAction === 'refocus') {
      const id = selectedPlanetId || focusPlanetId
      if (id) {
        setFocusPlanetId(id)
        setCameraFlying(true)
      }
    }

    clearCameraAction()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraAction])

  // Double-click empty space handled in App for fullscreen;
  // Double-click canvas with planet uses mesh handlers.

  useFrame((_, delta) => {
    const controls = controlsRef.current
    if (!controls) return
    const d = Math.min(delta, 0.05)

    // Free orbit when not piloting and not mid-autopilot
    const freeOrbit =
      controlMode === 'free' &&
      (travelPhase === 'idle' ||
        travelPhase === 'arrived' ||
        travelPhase === 'cancelled')
    controls.enabled = freeOrbit && !flying.current

    // Camera modes — always set baselines so Explorer restores correctly
    const baseRotate = cinematicMode ? 0.16 : 0.22
    const baseZoom = cinematicMode ? 0.24 : 0.32
    switch (cameraMode) {
      case 'documentary':
        controls.rotateSpeed = baseRotate * 0.55
        controls.zoomSpeed = baseZoom * 0.55
        controls.dampingFactor = 0.04
        break
      case 'drone':
        controls.rotateSpeed = baseRotate * 1.45
        controls.zoomSpeed = baseZoom * 1.5
        controls.dampingFactor = 0.022
        break
      case 'imax':
        controls.rotateSpeed = baseRotate * 0.75
        controls.zoomSpeed = baseZoom * 0.7
        controls.dampingFactor = 0.03
        break
      case 'orbit':
        controls.rotateSpeed = baseRotate * 0.7
        controls.zoomSpeed = baseZoom * 0.65
        controls.dampingFactor = 0.028
        break
      case 'explorer':
      default:
        controls.rotateSpeed = baseRotate
        controls.zoomSpeed = baseZoom
        controls.dampingFactor = cinematicMode ? 0.012 : 0.018
        break
    }

    // Dynamic min distance — stop above atmosphere
    const lockId = selectedPlanetId || focusPlanetId
    if (lockId && PLANETS_BY_ID[lockId]) {
      const body = PLANETS_BY_ID[lockId]
      const pad = body.id === 'sun' ? 1.35 : body.hasClouds || body.id === 'venus' ? 1.28 : 1.2
      controls.minDistance = Math.max(body.radius * pad + 0.15, 1.2)
    } else {
      controls.minDistance = 2.5
    }

    // Soft clamp if camera got inside min sphere while focused
    if (lockId && !flying.current) {
      const pos = getBodyPosition(lockId, year, animDays.current)
      const minD = controls.minDistance
      const toCam = camera.position.clone().sub(pos)
      const dist = toCam.length()
      if (dist < minD && dist > 0.001) {
        toCam.normalize().multiplyScalar(minD)
        camera.position.copy(pos).add(toCam)
      }
    }

    if (musicEnabled) {
      ambientEngine.setAtmosphere(camera.position.length(), focusPlanetId)
    }

    if (flying.current) {
      const speed = cinematicMode ? 0.09 : 0.14
      flyT.current = Math.min(1, flyT.current + d * speed)
      const t = easeInOutExpo(flyT.current)

      camera.position.lerpVectors(startPos.current, flyPosition.current, t)
      controls.target.lerpVectors(startTarget.current, flyTarget.current, t)
      controls.update()

      if (flyT.current >= 1) {
        const remain = camera.position.distanceTo(flyPosition.current)
        if (remain < 0.06) {
          flying.current = false
          controls.enabled = true
          setCameraFlying(false)
          lastPos.current.copy(camera.position)
        } else {
          const k = 1 - Math.exp(-d * 1.2)
          camera.position.lerp(flyPosition.current, k)
          controls.target.lerp(flyTarget.current, k)
          controls.update()
        }
      }
    } else {
      if (vel.current.lengthSq() > 1e-6) {
        camera.position.addScaledVector(vel.current, d)
        vel.current.multiplyScalar(Math.exp(-d * (cinematicMode ? 0.85 : 1.2)))
        controls.update()
      }

      // Planet lock — always track selected/focused body
      const trackId = selectedPlanetId || focusPlanetId
      if (trackId) {
        const pos = getBodyPosition(trackId, year, animDays.current)
        const blend = 1 - Math.exp(-d * (cinematicMode ? 0.4 : 0.7))
        controls.target.lerp(pos, blend)
        controls.update()
      }

      if (cinematicMode && !flying.current) {
        cinePhase.current += d * 0.05
        const drift = Math.sin(cinePhase.current) * 0.008
        const right = new THREE.Vector3()
        camera.getWorldDirection(right)
        right.cross(camera.up).normalize()
        camera.position.addScaledVector(right, drift * d * 1.5)
        controls.update()
      }

      lastPos.current.copy(camera.position)
    }

    if (camera instanceof THREE.PerspectiveCamera && freeOrbit) {
      let targetFov = cinematicMode ? 34 : 38
      if (cameraMode === 'imax') targetFov = 58
      else if (cameraMode === 'documentary') targetFov = 32
      else if (cameraMode === 'drone') targetFov = 48
      else if (cameraMode === 'orbit') targetFov = 40
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-d * 1.2))
      camera.updateProjectionMatrix()
    }

    // Persist zoom occasionally
    persistTimer.current += d
    if (persistTimer.current > 2.5) {
      persistTimer.current = 0
      setSavedCameraDistance(camera.position.length())
      setSavedCameraY(camera.position.y)
      useSimulatorStore.getState().persistNow()
    }
  })

  // Prevent context menu on right-drag orbit
  useEffect(() => {
    const el = gl.domElement
    const onCtx = (e: Event) => e.preventDefault()
    el.addEventListener('contextmenu', onCtx)
    return () => el.removeEventListener('contextmenu', onCtx)
  }, [gl])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={cinematicMode ? 0.012 : 0.018}
      rotateSpeed={cinematicMode ? 0.16 : 0.22}
      zoomSpeed={cinematicMode ? 0.24 : 0.32}
      panSpeed={cinematicMode ? 0.12 : 0.18}
      minDistance={2.5}
      maxDistance={240}
      maxPolarAngle={Math.PI * 0.95}
      enablePan
      zoomToCursor={false}
      // Left rotate · Middle pan · Right free rotate (orbit)
      mouseButtons={{
        LEFT: THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
      // Prevent accidental zoom-to-cursor jumps
      enableZoom
    />
  )
}

function getBodyPosition(id: string, year: number, animDays: number): THREE.Vector3 {
  const data = PLANETS_BY_ID[id]
  if (!data) return new THREE.Vector3()
  const [x, y, z] = getBodyWorldPosition(data, PLANETS_BY_ID, year, animDays)
  return new THREE.Vector3(x, y, z)
}

function easeInOutExpo(t: number) {
  if (t === 0 || t === 1) return t
  return t < 0.5
    ? Math.pow(2, 20 * t - 10) / 2
    : (2 - Math.pow(2, -20 * t + 10)) / 2
}
