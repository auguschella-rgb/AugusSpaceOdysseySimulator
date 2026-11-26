import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { PLANETS_BY_ID } from '../../data/planets'
import { getRotationAngle } from '../../utils/orbital'
import { useSimulationClock } from './SimulationClock'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { getNasaBodyTextures, requestBodyTexturesNear } from '../../utils/nasaTextureLoader'
import { useTextureStore } from '../../store/useTextureStore'
import { sfxEngine } from '../../audio/sfxEngine'

const sunVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const sunFragment = /* glsl */ `
  uniform sampler2D map;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 6; i++) {
      v += a * noise(p);
      p *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 flow1 = vec2(time * 0.008, time * 0.005);
    vec2 flow2 = vec2(-time * 0.006, time * 0.007);
    float n = fbm(uv * 14.0 + flow1);
    float n2 = fbm(uv * 32.0 - flow2);
    float n3 = fbm(uv * 64.0 + flow1 * 1.4);
    float gran = n * 0.5 + n2 * 0.32 + n3 * 0.18;
    float superG = fbm(uv * 4.0 + vec2(time * 0.003, -time * 0.002));

    vec3 base = texture2D(map, uv + vec2(n * 0.01, n2 * 0.008)).rgb;
    vec3 core = vec3(1.0, 0.96, 0.8);
    vec3 hot = vec3(1.0, 0.85, 0.42);
    vec3 mid = vec3(0.98, 0.52, 0.1);
    vec3 cool = vec3(0.7, 0.2, 0.04);
    vec3 spot = vec3(0.28, 0.1, 0.03);

    vec3 col = mix(cool, mid, gran);
    col = mix(col, hot, pow(gran, 1.4));
    col = mix(col, core, pow(gran, 2.5) * 0.55);
    col = mix(base, col, 0.6);
    col = mix(col, mid, superG * 0.12);

    float spots = fbm(uv * 5.0 + 3.0);
    if (spots > 0.72) col = mix(col, spot, (spots - 0.72) * 3.0);

    // Limb darkening (real photosphere)
    float ndv = abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
    float limb = pow(ndv, 0.5);
    col *= 0.5 + limb * 0.55;

    // Subtle prominence only at extreme limb — no giant discs
    float limbEdge = pow(1.0 - ndv, 3.5);
    float flare = fbm(uv * 9.0 + vec2(time * 0.15, -time * 0.12));
    col += vec3(1.0, 0.4, 0.08) * flare * limbEdge * 0.35;

    float pulse = 0.97 + 0.03 * sin(time * 0.3 + n * 6.28);
    col *= pulse * 1.05;

    gl_FragColor = vec4(col, 1.0);
  }
`

/** Tight, soft corona — NOT giant concentric orange rings */
const coronaVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorldPos = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`
const coronaFragment = /* glsl */ `
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fres = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.8);
    // Soft white-yellow corona, very tight falloff
    vec3 col = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.7, 0.35), fres);
    float a = fres * intensity;
    gl_FragColor = vec4(col, a);
  }
`

export function Sun() {
  const data = PLANETS_BY_ID.sun
  const meshRef = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const promRef = useRef<THREE.Group>(null)
  const { animDays } = useSimulationClock()
  const year = useSimulatorStore((s) => s.simulationYear)
  const selectPlanet = useSimulatorStore((s) => s.selectPlanet)
  const pointerDragging = useSimulatorStore((s) => s.pointerDragging)
  const markBodyDblClick = useSimulatorStore((s) => s.markBodyDblClick)

  const texRevision = useTextureStore((s) => s.revision)
  const bumpTextures = useTextureStore((s) => s.bump)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const nasa = useMemo(() => getNasaBodyTextures('sun'), [texRevision])
  const uniforms = useMemo(
    () => ({ map: { value: nasa.map }, time: { value: 0 } }),
    [nasa.map]
  )

  useFrame((state, delta) => {
    // Mobile: lazy-load the Sun map once the camera is near / Sun selected
    requestBodyTexturesNear(
      'sun',
      state.camera.position.length(),
      data.radius,
      selectedPlanetId === 'sun',
      bumpTextures
    )
    if (meshRef.current) {
      meshRef.current.rotation.y = getRotationAngle(data, year, animDays.current)
    }
    if (matRef.current) matRef.current.uniforms.time.value += delta
    if (promRef.current) {
      promRef.current.rotation.y += delta * 0.03
    }
  })

  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    markBodyDblClick()
    if (pointerDragging) return
    void sfxEngine.playSelect()
    selectPlanet('sun', true)
  }

  return (
    <group>
      {/* Photosphere — animated plasma */}
      <mesh
        ref={meshRef}
        onDoubleClick={handleDoubleClick}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[data.radius, 128, 128]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={sunVertex}
          fragmentShader={sunFragment}
          uniforms={uniforms}
          toneMapped={false}
        />
      </mesh>

      {/* Thin chromosphere edge only */}
      <mesh scale={1.015}>
        <sphereGeometry args={[data.radius, 48, 48]} />
        <meshBasicMaterial
          color="#ffcc88"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Soft corona shell — close to surface, no giant discs */}
      <mesh scale={1.22}>
        <sphereGeometry args={[data.radius, 48, 48]} />
        <shaderMaterial
          vertexShader={coronaVertex}
          fragmentShader={coronaFragment}
          uniforms={{ intensity: { value: 0.22 } }}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh scale={1.45}>
        <sphereGeometry args={[data.radius, 32, 32]} />
        <shaderMaterial
          vertexShader={coronaVertex}
          fragmentShader={coronaFragment}
          uniforms={{ intensity: { value: 0.08 } }}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* Small prominences along limb only — planes hug surface */}
      <group ref={promRef}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + 0.3
          return (
            <mesh
              key={i}
              position={[
                Math.cos(a) * data.radius * 1.02,
                Math.sin(i * 1.3) * data.radius * 0.15,
                Math.sin(a) * data.radius * 1.02,
              ]}
              rotation={[0, -a, Math.PI / 2]}
            >
              <planeGeometry args={[data.radius * 0.12, data.radius * 0.35]} />
              <meshBasicMaterial
                color="#ff9944"
                transparent
                opacity={0.08}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          )
        })}
      </group>

      {/* Primary sunlight only — planets lit from Sun */}
      <pointLight color="#fff0d8" intensity={220} distance={400} decay={1.7} />
      <pointLight color="#ffc888" intensity={40} distance={100} decay={2} />
    </group>
  )
}
