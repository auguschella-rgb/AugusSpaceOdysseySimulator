import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { StarField } from './StarField'
import { Sun } from './Sun'
import { Planet } from './Planet'
import { CameraController } from './CameraController'
import { SimulationClockProvider } from './SimulationClock'
import { PostFX } from './PostFX'
import { LensFlare } from './LensFlare'
import { TextureWarmup } from './TextureWarmup'
import { PhotoModeEnhancer } from './PhotoModeEnhancer'
import { PointerGate } from './PointerGate'
import { ORBITING_BODIES } from '../../data/planets'
import { Comets } from './Comets'
import { SpacecraftController } from './SpacecraftController'
import { TravelSystem } from './TravelSystem'
import { WarpEffect } from './WarpEffect'
import { Satellites } from './Satellites'
import * as THREE from 'three'
import { isMobile } from '../../utils/device'

function SceneContent() {
  return (
    <SimulationClockProvider>
      <TextureWarmup />
      <PhotoModeEnhancer />
      <PointerGate />
      {/* True deep black void — never change on photo mode */}
      <color attach="background" args={['#000000']} />
      <fog attach="fog" args={['#000000', 140, 380]} />

      <ambientLight intensity={0.008} color="#304060" />
      <hemisphereLight args={['#0a1020', '#000000', 0.04]} />

      <StarField />
      <Sun />

      {ORBITING_BODIES.map((planet) => (
        <Planet key={planet.id} data={planet} />
      ))}

      <Comets />
      <Satellites />
      <WarpEffect />

      <CameraController />
      <SpacecraftController />
      <TravelSystem />
      <LensFlare />
      {/* Mobile: no EffectComposer (HalfFloat FBOs + 6 passes are too heavy) */}
      {!isMobile && <PostFX />}
    </SimulationClockProvider>
  )
}

export function SolarSystemScene() {
  return (
    <div className="absolute inset-0 z-0 bg-black">
      <Canvas
        camera={{ position: [0, 38, 85], fov: 36, near: 0.1, far: 700 }}
        dpr={isMobile ? 1 : [1, 1.5]}
        shadows={false}
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: 'high-performance',
          stencil: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.85,
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 1)
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 0.85
          gl.autoClear = true
        }}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
    </div>
  )
}
