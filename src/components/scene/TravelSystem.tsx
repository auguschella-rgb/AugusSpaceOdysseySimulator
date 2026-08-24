import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useExplorationStore } from '../../store/useExplorationStore'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { PLANETS_BY_ID } from '../../data/planets'
import { getBodyWorldPosition } from '../../utils/orbital'
import { useSimulationClock } from './SimulationClock'
import { WARP_SPEEDS } from '../../data/missions'
import { ambientEngine } from '../../audio/ambientEngine'

/**
 * Distance-based autopilot — progress never hits 100% until arrive threshold.
 * States: planning → accelerating → cruising → approaching → decelerating → arrived
 */
export function TravelSystem() {
  const { camera } = useThree()
  const { animDays } = useSimulationClock()
  const year = useSimulatorStore((s) => s.simulationYear)
  const musicEnabled = useSimulatorStore((s) => s.musicEnabled)
  const selectPlanet = useSimulatorStore((s) => s.selectPlanet)

  const travelTargetId = useExplorationStore((s) => s.travelTargetId)
  const travelPhase = useExplorationStore((s) => s.travelPhase)
  const setTravelPhase = useExplorationStore((s) => s.setTravelPhase)
  const setTravelProgress = useExplorationStore((s) => s.setTravelProgress)
  const completeTravel = useExplorationStore((s) => s.completeTravel)
  const cancelTravel = useExplorationStore((s) => s.cancelTravel)
  const setWarpLevel = useExplorationStore((s) => s.setWarpLevel)

  const startPos = useRef(new THREE.Vector3())
  const initialDist = useRef(1)
  const velocity = useRef(0)
  const look = useRef(new THREE.Vector3())
  const armed = useRef(false)
  const arriveHold = useRef(0)

  useFrame((_, delta) => {
    // Cancelled: stop motion immediately, clear to idle after brief UI flash
    if (travelPhase === 'cancelled') {
      armed.current = false
      velocity.current = 0
      arriveHold.current += delta
      if (arriveHold.current > 0.35) {
        useExplorationStore.setState({ travelPhase: 'idle' })
        arriveHold.current = 0
      }
      return
    }

    if (travelPhase === 'idle' || !travelTargetId) {
      armed.current = false
      arriveHold.current = 0
      return
    }

    if (travelPhase === 'arrived') {
      // Hold arrived state briefly so UI can show 100%, then clear to idle
      arriveHold.current += delta
      if (arriveHold.current > 0.6) {
        useExplorationStore.setState({
          travelTargetId: null,
          travelPhase: 'idle',
          travelProgress: 1,
          travelError: null,
        })
        arriveHold.current = 0
      }
      return
    }

    const body = PLANETS_BY_ID[travelTargetId]
    if (!body) {
      cancelTravel()
      return
    }

    const [tx, ty, tz] = getBodyWorldPosition(body, PLANETS_BY_ID, year, animDays.current)
    const destCore = new THREE.Vector3(tx, ty, tz)
    const approachDist = Math.max(body.radius * 7.5, 3.2)

    // Desired stop point: offset from body toward current camera
    const away = camera.position.clone().sub(destCore)
    if (away.lengthSq() < 1e-6) away.set(0.8, 0.35, 1)
    away.normalize().multiplyScalar(approachDist)
    const dest = destCore.clone().add(away)

    const remaining = camera.position.distanceTo(dest)

    // PLANNING — capture start, auto-warp for long hauls
    if (travelPhase === 'planning' || !armed.current) {
      startPos.current.copy(camera.position)
      initialDist.current = Math.max(remaining, 0.5)
      velocity.current = 0
      armed.current = true
      setTravelPhase('accelerating')
      setTravelProgress(0)

      const dist = remaining
      const wl = useExplorationStore.getState().warpLevel
      if (wl === 0) {
        if (dist > 100) setWarpLevel(10)
        else if (dist > 55) setWarpLevel(5)
        else if (dist > 25) setWarpLevel(1)
      }
      return
    }

    const d = Math.min(delta, 0.05)
    const wl = useExplorationStore.getState().warpLevel
    const warpBoost = WARP_SPEEDS[wl] || 0

    // Base cruise speed (scene units / sec) scales with warp
    const baseCruise = 6 + warpBoost * 0.35
    const accelRate = 4 + warpBoost * 0.15
    const decelStart = Math.max(approachDist * 3.5, initialDist.current * 0.18)

    // ARRIVED — only when within threshold (distance-based, never fake)
    if (remaining <= approachDist * 1.05) {
      camera.position.copy(dest)
      camera.lookAt(destCore)
      setTravelProgress(1)
      setWarpLevel(0)
      completeTravel()
      selectPlanet(travelTargetId, false)
      useSimulatorStore.getState().setFocusPlanetId(travelTargetId)
      useSimulatorStore.getState().setCameraFlying(false)
      useExplorationStore.getState().setControlMode('free')
      useExplorationStore.getState().setCameraMode('orbit')
      if (musicEnabled) ambientEngine.setWarpIntensity(0)
      return
    }

    // Phase from remaining distance
    let phase: 'accelerating' | 'cruising' | 'approaching' | 'decelerating' =
      'accelerating'
    if (remaining > initialDist.current * 0.75) {
      phase = 'accelerating'
    } else if (remaining > decelStart) {
      phase = 'cruising'
    } else if (remaining > approachDist * 1.8) {
      phase = 'approaching'
      if (wl > 1) setWarpLevel(1)
    } else {
      phase = 'decelerating'
      if (wl > 0) setWarpLevel(0)
    }

    if (phase !== travelPhase) setTravelPhase(phase)

    // Landing foundation: approach when close; never DESCENT/LANDED without physics
    if (phase === 'approaching' || phase === 'decelerating') {
      if (useExplorationStore.getState().landingPhase !== 'approach') {
        useExplorationStore.getState().setLandingPhase('approach')
      }
    }

    // Progress: distance closed (cap 0.99 until arrive branch above)
    const closed = initialDist.current - remaining
    const progress = Math.max(0, Math.min(0.99, closed / initialDist.current))
    setTravelProgress(progress)

    // Integrate velocity toward destination
    if (phase === 'accelerating') {
      velocity.current = Math.min(baseCruise, velocity.current + accelRate * d)
    } else if (phase === 'cruising') {
      velocity.current = THREE.MathUtils.lerp(velocity.current, baseCruise, 1 - Math.exp(-d * 2))
    } else if (phase === 'approaching') {
      const targetV = baseCruise * 0.35
      velocity.current = THREE.MathUtils.lerp(velocity.current, targetV, 1 - Math.exp(-d * 3))
    } else {
      const targetV = Math.max(1.2, remaining * 0.45)
      velocity.current = THREE.MathUtils.lerp(velocity.current, targetV, 1 - Math.exp(-d * 4))
    }

    const dir = dest.clone().sub(camera.position)
    const dist = dir.length()
    if (dist > 1e-4) {
      dir.normalize()
      const step = Math.min(dist, velocity.current * d)
      camera.position.addScaledVector(dir, step)
    }

    look.current.lerp(destCore, 1 - Math.exp(-d * 2.2))
    camera.lookAt(look.current)

    if (musicEnabled) {
      ambientEngine.setAtmosphere(camera.position.length(), travelTargetId)
      const warpI =
        phase === 'cruising' || phase === 'accelerating'
          ? Math.min(1, (wl === 100 ? 1 : wl / 10) || 0.25)
          : phase === 'approaching'
            ? 0.15
            : 0
      ambientEngine.setWarpIntensity(warpI)
    }
  })

  return null
}
