import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Html, Line } from '@react-three/drei'
import type { PlanetData } from '../../data/planets'
import {
  getOrbitalAngle,
  getRotationAngle,
  orbitalPosition,
  PHASE_OFFSETS,
  getBodyWorldPosition,
} from '../../utils/orbital'
import { useSimulationClock } from './SimulationClock'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { PLANETS_BY_ID } from '../../data/planets'
import { getNasaBodyTextures } from '../../utils/nasaTextureLoader'
import { useTextureStore } from '../../store/useTextureStore'
import { Atmosphere, ScatteringShell, RimLight } from './Atmosphere'
import { sfxEngine } from '../../audio/sfxEngine'

interface PlanetProps {
  data: PlanetData
}

/** Gas giant — multi-layer NASA albedo with turbulence, depth & soft penumbra */
const gasVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vec4 mv = viewMatrix * world;
    vViewPosition = -mv.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`
const gasFragment = /* glsl */ `
  uniform sampler2D map;
  uniform sampler2D normalMap;
  uniform float time;
  uniform float speed;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec3 vWorldPos;

  void main() {
    float t = time * speed * 0.35;
    // Multi-layer wind shear (cloud height illusion)
    vec2 uvDeep = vUv + vec2(t * 0.0022, 0.0);
    uvDeep.x += sin(vUv.y * 36.0 + t * 0.08) * 0.0015;
    vec2 uvMid = vUv + vec2(t * 0.004, 0.004);
    uvMid.x += sin(vUv.y * 52.0 - t * 0.1) * 0.0025;
    vec2 uvTop = vUv + vec2(t * 0.0065, -0.003);
    uvTop.x += sin(vUv.y * 28.0 + t * 0.15) * 0.003;

    vec3 deep = texture2D(map, uvDeep).rgb;
    vec3 mid = texture2D(map, uvMid).rgb;
    vec3 top = texture2D(map, uvTop).rgb;
    vec3 col = mix(deep, mid, 0.45);
    col = mix(col, top, 0.28);

    // Subtle normal perturbation for cloud height
    vec3 nTex = texture2D(normalMap, uvMid).xyz * 2.0 - 1.0;
    vec3 n = normalize(vNormal + nTex * 0.15);

    vec3 toSun = normalize(-vWorldPos);
    float ndl = dot(n, toSun);
    // Soft penumbra / eclipse terminator
    float day = smoothstep(-0.22, 0.38, ndl);
    float penumbra = exp(-pow(ndl * 3.5, 2.0));
    float ambient = 0.012;
    float bounce = max(-ndl, 0.0) * 0.04;
    col *= mix(ambient + bounce, 0.42 + max(ndl, 0.0) * 0.62, day);
    // Warm sunset limb on gas giants
    col += vec3(1.0, 0.65, 0.35) * penumbra * 0.12 * day;

    float fresnel = pow(1.0 - max(dot(normalize(vViewPosition), n), 0.0), 2.5);
    float backlit = pow(max(-ndl, 0.0), 1.25);
    col += col * fresnel * 0.16;
    col += vec3(1.0, 0.9, 0.75) * fresnel * max(ndl, 0.0) * 0.12;
    col += vec3(1.0, 0.72, 0.4) * backlit * fresnel * 0.4;

    gl_FragColor = vec4(col, 1.0);
  }
`

/** Earth ocean specular + night lights integrated shader path for physical look */
const earthExtrasVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const nightFragment = /* glsl */ `
  uniform sampler2D nightMap;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vec3 toSun = normalize(-vWorldPos);
    float ndl = dot(normalize(vWorldNormal), toSun);
    // Soft day/night transition (penumbra)
    float night = 1.0 - smoothstep(-0.05, 0.28, ndl);
    vec3 lights = texture2D(nightMap, vUv).rgb;
    float lum = max(lights.r, max(lights.g, lights.b));
    gl_FragColor = vec4(lights * 1.7, night * lum * 2.0);
  }
`

export function Planet({ data }: PlanetProps) {
  const groupRef = useRef<THREE.Group>(null)
  const bodyRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const cloudsRef = useRef<THREE.Mesh>(null)
  const clouds2Ref = useRef<THREE.Mesh>(null)
  const ringsRef = useRef<THREE.Mesh>(null)
  const nightRef = useRef<THREE.Mesh>(null)
  const gasMatRef = useRef<THREE.ShaderMaterial>(null)
  const dustRef = useRef<THREE.Mesh>(null)
  const lodRef = useRef({ near: true, dist: 100 })
  const { animDays } = useSimulationClock()
  const year = useSimulatorStore((s) => s.simulationYear)
  const showOrbits = useSimulatorStore((s) => s.showOrbits)
  const showLabels = useSimulatorStore((s) => s.showLabels)
  const selectedPlanetId = useSimulatorStore((s) => s.selectedPlanetId)
  const selectPlanet = useSimulatorStore((s) => s.selectPlanet)
  const pointerDragging = useSimulatorStore((s) => s.pointerDragging)
  const markBodyDblClick = useSimulatorStore((s) => s.markBodyDblClick)
  const photoMode = useSimulatorStore((s) => s.photoMode)
  const texRevision = useTextureStore((s) => s.revision)

  // NASA scientific maps (revision bumps after preload)
  const nasa = useMemo(() => getNasaBodyTextures(data.id), [data.id, texRevision])
  const maps = useMemo(
    () => ({
      map: nasa.map,
      normalMap: nasa.normalMap,
      roughnessMap: nasa.roughnessMap,
      aoMap: nasa.aoMap,
      displacementMap: nasa.displacementMap,
      cloudsMap: nasa.cloudsMap,
      emissiveMap: nasa.nightMap,
      ringsMap: nasa.ringsMap,
    }),
    [nasa]
  )
  const isGas = ['jupiter', 'saturn', 'uranus', 'neptune'].includes(data.id)
  const isEarth = data.id === 'earth'
  const isRocky = ['moon', 'mercury', 'mars', 'pluto'].includes(data.id)

  const gasUniforms = useMemo(
    () =>
      isGas
        ? {
            map: { value: maps.map },
            normalMap: { value: maps.normalMap ?? maps.map },
            time: { value: 0 },
            speed: {
              value:
                data.id === 'jupiter'
                  ? 1.0
                  : data.id === 'neptune'
                    ? 0.75
                    : data.id === 'saturn'
                      ? 0.55
                      : 0.4,
            },
          }
        : null,
    [isGas, maps.map, maps.normalMap, data.id]
  )

  const orbitPoints = useMemo(() => {
    if (data.isMoon || data.orbitRadius <= 0) return null
    const pts: [number, number, number][] = []
    const segments = 180
    const e = data.eccentricity ?? 0
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      pts.push(orbitalPosition(data.orbitRadius, a, data.inclination, e))
    }
    return pts
  }, [data])

  // Displacement from derived height maps — stronger on rocky, subtle on Earth
  const maxDisp =
    data.id === 'moon' || data.id === 'mercury'
      ? 0.022 * data.radius
      : data.id === 'mars'
        ? 0.018 * data.radius
        : data.id === 'pluto'
          ? 0.014 * data.radius
          : isEarth
            ? 0.006 * data.radius
            : 0

  // AO maps use uv2 in Three.js — mirror uv → uv2
  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const geo = mesh.geometry as THREE.BufferGeometry
    const uv = geo.attributes.uv
    if (uv && !geo.attributes.uv2) {
      geo.setAttribute('uv2', uv.clone())
    }
  }, [data.id, texRevision])

  useFrame((state, delta) => {
    const phase = PHASE_OFFSETS[data.id] ?? 0
    const angle = getOrbitalAngle(data, year, animDays.current, phase)
    const rot = getRotationAngle(data, year, animDays.current)

    // Continuous elliptical orbits + moon hierarchy (Living Solar System)
    if (groupRef.current) {
      const [x, y, z] = getBodyWorldPosition(data, PLANETS_BY_ID, year, animDays.current)
      groupRef.current.position.set(x, y, z)
    }

    // Keep angle for orbit lines (elliptical)
    void angle

    // Distance-based LOD: displacement, normal intensity, cloud layers
    if (groupRef.current) {
      const dist = state.camera.position.distanceTo(groupRef.current.position)
      lodRef.current.dist = dist
      const near = dist < data.radius * 32 + 20
      const mid = dist < data.radius * 55 + 40
      lodRef.current.near = near
      if (meshRef.current) {
        const mat = meshRef.current.material as THREE.MeshPhysicalMaterial
        if (mat && mat.isMeshPhysicalMaterial) {
          const targetDisp = near ? maxDisp : mid ? maxDisp * 0.35 : 0
          mat.displacementScale = THREE.MathUtils.lerp(
            mat.displacementScale,
            targetDisp,
            1 - Math.exp(-delta * 2.5)
          )
          const nScale = near ? (isRocky ? 1.35 : isEarth ? 1.0 : 0.75) : mid ? 0.7 : 0.4
          mat.normalScale.set(
            THREE.MathUtils.lerp(mat.normalScale.x, nScale, 1 - Math.exp(-delta * 2)),
            THREE.MathUtils.lerp(mat.normalScale.y, nScale, 1 - Math.exp(-delta * 2))
          )
        }
      }
      if (clouds2Ref.current) {
        clouds2Ref.current.visible = near && (isEarth || data.id === 'venus')
      }
    }

    if (bodyRef.current) {
      bodyRef.current.rotation.z = (data.axialTilt * Math.PI) / 180
    }
    if (meshRef.current) meshRef.current.rotation.y = rot
    if (nightRef.current) nightRef.current.rotation.y = rot
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = rot * 1.12 + animDays.current * 0.0012
    }
    if (clouds2Ref.current) {
      clouds2Ref.current.rotation.y = rot * 0.88 - animDays.current * 0.0008
    }
    if (ringsRef.current) ringsRef.current.rotation.x = Math.PI / 2.35
    if (gasMatRef.current) gasMatRef.current.uniforms.time.value += delta
    if (dustRef.current && data.id === 'mars') {
      const mat = dustRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.025 + Math.sin(performance.now() * 0.00015) * 0.012
      dustRef.current.rotation.y += delta * 0.01
    }
  })

  /** Single click never selects (orbit-safe). Double-click intentionally focuses. */
  const handleDoubleClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    markBodyDblClick()
    if (pointerDragging) return
    void sfxEngine.playSelect()
    selectPlanet(data.id, true)
  }

  const isSelected = selectedPlanetId === data.id
  // Higher tessellation for displacement quality
  const segs = data.radius > 1.2 ? 96 : data.radius > 0.45 ? 80 : 64

  return (
    <>
      {showOrbits && !photoMode && orbitPoints && !data.isMoon && (
        <Line
          points={orbitPoints}
          color="#6a8ec8"
          transparent
          opacity={0.16}
          lineWidth={1}
          depthWrite={false}
        />
      )}

      <group ref={groupRef}>
        <group ref={bodyRef}>
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
            <sphereGeometry args={[data.radius, segs, segs]} />
            {isGas && gasUniforms ? (
              <shaderMaterial
                key={`gas-${data.id}-${texRevision}`}
                ref={gasMatRef}
                vertexShader={gasVertex}
                fragmentShader={gasFragment}
                uniforms={gasUniforms}
              />
            ) : (
              <meshPhysicalMaterial
                key={`mat-${data.id}-${texRevision}`}
                map={maps.map}
                normalMap={maps.normalMap}
                normalScale={new THREE.Vector2(isRocky ? 1.25 : isEarth ? 0.95 : 0.7, isRocky ? 1.25 : isEarth ? 0.95 : 0.7)}
                roughnessMap={maps.roughnessMap}
                roughness={isEarth ? 0.48 : data.roughness}
                metalness={data.id === 'mercury' ? 0.2 : isEarth ? 0.06 : data.metalness}
                aoMap={maps.aoMap}
                aoMapIntensity={isRocky ? 1.25 : isEarth ? 0.9 : 0.7}
                displacementMap={maps.displacementMap}
                displacementScale={0}
                displacementBias={maps.displacementMap ? -maxDisp * 0.3 : 0}
                // Earth oceans: clearcoat Fresnel + specular
                clearcoat={isEarth ? 0.55 : data.id === 'venus' ? 0.15 : 0}
                clearcoatRoughness={isEarth ? 0.12 : 0.4}
                reflectivity={isEarth ? 0.72 : 0.12}
                ior={isEarth ? 1.33 : 1.5}
                envMapIntensity={isEarth ? 0.35 : 0.15}
                sheen={isEarth ? 0.18 : 0}
                sheenRoughness={0.45}
                sheenColor={isEarth ? new THREE.Color('#1a5a9a') : new THREE.Color('#000')}
                emissive={isSelected ? data.color : '#000000'}
                emissiveIntensity={isSelected ? 0.03 : 0}
              />
            )}
          </mesh>

          <RimLight radius={data.radius} color={data.color} />

          {/* Black Marble night lights — soft terminator */}
          {isEarth && maps.emissiveMap && (
            <mesh ref={nightRef} scale={1.002}>
              <sphereGeometry args={[data.radius, segs, segs]} />
              <shaderMaterial
                key={`night-${texRevision}`}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
                vertexShader={earthExtrasVertex}
                fragmentShader={nightFragment}
                uniforms={{ nightMap: { value: maps.emissiveMap } }}
              />
            </mesh>
          )}

          {/* Dual cloud layers + height offset */}
          {data.hasClouds && maps.cloudsMap && (
            <>
              <mesh ref={cloudsRef} scale={1.018}>
                <sphereGeometry args={[data.radius, segs, segs]} />
                <meshPhysicalMaterial
                  key={`clouds-${texRevision}`}
                  map={maps.cloudsMap}
                  transparent
                  opacity={0.78}
                  depthWrite={false}
                  roughness={0.95}
                  metalness={0}
                  side={THREE.FrontSide}
                  alphaTest={0.015}
                />
              </mesh>
              <mesh ref={clouds2Ref} scale={1.028}>
                <sphereGeometry args={[data.radius, 56, 56]} />
                <meshBasicMaterial
                  key={`clouds2-${texRevision}`}
                  map={maps.cloudsMap}
                  transparent
                  opacity={0.2}
                  depthWrite={false}
                  side={THREE.FrontSide}
                />
              </mesh>
            </>
          )}

          {/* Venus multi-layer sulfur haze */}
          {data.id === 'venus' && (
            <>
              <mesh scale={1.03}>
                <sphereGeometry args={[data.radius, 48, 48]} />
                <meshBasicMaterial color="#e8c878" transparent opacity={0.14} depthWrite={false} />
              </mesh>
              <mesh scale={1.055}>
                <sphereGeometry args={[data.radius, 40, 40]} />
                <meshBasicMaterial color="#d4a848" transparent opacity={0.08} depthWrite={false} />
              </mesh>
            </>
          )}

          {/* Mars thin dust haze */}
          {data.id === 'mars' && (
            <mesh ref={dustRef} scale={1.03}>
              <sphereGeometry args={[data.radius, 36, 36]} />
              <meshBasicMaterial
                color="#c48a58"
                transparent
                opacity={0.04}
                depthWrite={false}
                side={THREE.FrontSide}
              />
            </mesh>
          )}

          {/* Atmospheres — density scales scattering */}
          {data.id === 'earth' && (
            <>
              <Atmosphere
                radius={data.radius}
                color="#5aa8ff"
                intensity={0.9}
                power={2.75}
                scale={1.105}
                aurora={0.35}
                density={1}
              />
              <ScatteringShell radius={data.radius} color="#8ec8ff" scale={1.18} opacity={0.04} />
            </>
          )}
          {data.id === 'venus' && (
            <Atmosphere
              radius={data.radius}
              color="#e0b860"
              intensity={0.85}
              power={2.0}
              scale={1.13}
              density={1.6}
            />
          )}
          {data.id === 'mars' && (
            <Atmosphere
              radius={data.radius}
              color="#c87850"
              intensity={0.32}
              power={3.0}
              scale={1.06}
              density={0.25}
            />
          )}
          {(data.id === 'jupiter' || data.id === 'saturn') && (
            <Atmosphere
              radius={data.radius}
              color={data.id === 'jupiter' ? '#d4a878' : '#e8d4a0'}
              intensity={0.38}
              power={2.35}
              scale={1.055}
              density={0.85}
            />
          )}
          {data.id === 'uranus' && (
            <Atmosphere
              radius={data.radius}
              color="#7ec8c8"
              intensity={0.5}
              power={2.5}
              scale={1.085}
              density={0.7}
            />
          )}
          {data.id === 'neptune' && (
            <Atmosphere
              radius={data.radius}
              color="#4080e0"
              intensity={0.55}
              power={2.45}
              scale={1.085}
              density={0.75}
            />
          )}

          {/* Saturn rings — multi-band particle look + shadows */}
          {data.hasRings && maps.ringsMap && (
            <>
              <mesh ref={ringsRef}>
                <ringGeometry args={[data.radius * 1.28, data.radius * 2.52, 220]} />
                <meshPhysicalMaterial
                  key={`rings-${texRevision}`}
                  map={maps.ringsMap}
                  transparent
                  opacity={0.9}
                  side={THREE.DoubleSide}
                  roughness={0.5}
                  metalness={0.28}
                  depthWrite={false}
                  alphaTest={0.025}
                  clearcoat={0.4}
                  clearcoatRoughness={0.25}
                />
              </mesh>
              {/* Ice particle sparkle sheet */}
              <mesh rotation={[Math.PI / 2.35, 0, 0.012]}>
                <ringGeometry args={[data.radius * 1.35, data.radius * 2.4, 180]} />
                <meshBasicMaterial
                  map={maps.ringsMap}
                  transparent
                  opacity={0.2}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
              {/* A–B density band variation */}
              <mesh rotation={[Math.PI / 2.35, 0, -0.01]}>
                <ringGeometry args={[data.radius * 1.45, data.radius * 1.72, 128]} />
                <meshBasicMaterial
                  color="#e8dcc8"
                  transparent
                  opacity={0.08}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
              {/* Cassini Division */}
              <mesh rotation={[Math.PI / 2.35, 0, 0]}>
                <ringGeometry args={[data.radius * 1.78, data.radius * 1.9, 96]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              {/* Encke Gap hint */}
              <mesh rotation={[Math.PI / 2.35, 0, 0]}>
                <ringGeometry args={[data.radius * 2.18, data.radius * 2.24, 80]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
              {/* Outer faint C/F dust */}
              <mesh rotation={[Math.PI / 2.35, 0, 0.02]}>
                <ringGeometry args={[data.radius * 2.35, data.radius * 2.55, 96]} />
                <meshBasicMaterial color="#d0c8b8" transparent opacity={0.06} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
              </mesh>
              {/* Ring shadow on planet (soft penumbra) */}
              <mesh rotation={[Math.PI / 2.35, 0, 0]} scale={[1, 0.07, 1]}>
                <sphereGeometry args={[data.radius * 1.012, 72, 18]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
              </mesh>
              <mesh rotation={[Math.PI / 2.35, 0, 0]} scale={[1, 0.1, 1]}>
                <sphereGeometry args={[data.radius * 1.008, 48, 12]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.12} depthWrite={false} />
              </mesh>
              {/* Soft planet shadow on rings */}
              <mesh rotation={[Math.PI / 2.35, 0, 0]}>
                <ringGeometry args={[data.radius * 1.28, data.radius * 1.58, 64, 1, 0, Math.PI]} />
                <meshBasicMaterial color="#000000" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            </>
          )}

          {isSelected && (
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[data.radius * 1.42, data.radius * 1.55, 64]} />
              <meshBasicMaterial
                color="#a8c8ff"
                transparent
                opacity={0.48}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          )}
        </group>

        {showLabels && !photoMode && !data.isMoon && (
          <Html
            position={[0, data.radius + 0.65, 0]}
            center
            distanceFactor={28}
            style={{ pointerEvents: 'none' }}
          >
            <div
              className="text-[10px] tracking-[0.2em] uppercase whitespace-nowrap"
              style={{
                color: isSelected ? '#ffffff' : 'rgba(200,220,255,0.55)',
                fontFamily: 'Orbitron, Inter, sans-serif',
                textShadow: '0 0 8px rgba(0,0,0,0.9)',
                fontWeight: 500,
              }}
            >
              {data.name}
            </div>
          </Html>
        )}
      </group>
    </>
  )
}
