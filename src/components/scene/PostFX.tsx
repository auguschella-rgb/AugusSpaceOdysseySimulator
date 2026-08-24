import { useMemo } from 'react'
import {
  EffectComposer,
  Bloom,
  Vignette,
  Noise,
  ChromaticAberration,
  BrightnessContrast,
  HueSaturation,
} from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import * as THREE from 'three'

/**
 * Stable documentary post stack.
 * CRITICAL: Photo Mode must NOT remount composer or change HDR path.
 * Grain opacity is the only soft visual optional (still same pipeline).
 * Tone mapping stays on the WebGLRenderer (ACES) — do not double-map here
 * (double ACES was a common cause of washed/white frames).
 */
export function PostFX() {
  const filmGrain = useSimulatorStore((s) => s.filmGrain)
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const chroma = useMemo(() => new THREE.Vector2(0.00008, 0.00006), [])

  // Fixed effect values — identical whether photo mode is on or off
  // (photo mode only hides UI + raises DPR via PhotoModeEnhancer)
  return (
    <EffectComposer
      multisampling={0}
      enableNormalPass={false}
      frameBufferType={THREE.HalfFloatType}
      // Keep clear coherent with deep-space black
      autoClear={true}
    >
      <Bloom
        intensity={0.08}
        luminanceThreshold={0.92}
        luminanceSmoothing={0.65}
        mipmapBlur
        radius={0.4}
      />
      <BrightnessContrast brightness={0} contrast={0.06} />
      <HueSaturation saturation={-0.06} hue={0} />
      <Vignette offset={0.35} darkness={0.38} eskil={false} />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={chroma}
        radialModulation={false}
        modulationOffset={0}
      />
      <Noise
        premultiply
        blendFunction={BlendFunction.SOFT_LIGHT}
        opacity={photoMode && filmGrain ? 0.06 : filmGrain ? 0.015 : 0.01}
      />
    </EffectComposer>
  )
}
