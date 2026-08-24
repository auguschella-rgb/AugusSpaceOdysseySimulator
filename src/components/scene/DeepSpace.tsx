import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { AsteroidBelt } from './AsteroidBelt'

const STAR_PALETTE = [
  new THREE.Color('#9ec5ff'), // blue
  new THREE.Color('#c8dcff'), // blue-white
  new THREE.Color('#ffffff'), // white
  new THREE.Color('#fff5e0'), // warm white
  new THREE.Color('#ffe8a0'), // yellow
  new THREE.Color('#ffc878'), // orange
  new THREE.Color('#ff9a70'), // red-orange
  new THREE.Color('#ff7060'), // red
]

/**
 * Multi-layer procedural star field with magnitude, color, subtle twinkle,
 * and camera parallax (near layer drifts more than far).
 */
function StarLayer({
  count,
  minR,
  maxR,
  size,
  parallax,
  twinkle,
  opacity = 0.9,
}: {
  count: number
  minR: number
  maxR: number
  size: number
  parallax: number
  twinkle: number
  opacity?: number
}) {
  const ref = useRef<THREE.Points>(null)
  const matRef = useRef<THREE.ShaderMaterial>(null)
  const { camera } = useThree()
  const { positions, colors, phases } = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const phases = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const r = minR + Math.random() * (maxR - minR)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55
      positions[i * 3 + 2] = r * Math.cos(phi)
      const c = STAR_PALETTE[Math.floor(Math.random() * STAR_PALETTE.length)]
      // Log-ish magnitude distribution: most stars faint
      const mag = Math.pow(Math.random(), 2.2) * 0.85 + 0.08
      colors[i * 3] = c.r * mag
      colors[i * 3 + 1] = c.g * mag
      colors[i * 3 + 2] = c.b * mag
      phases[i] = Math.random() * Math.PI * 2
    }
    return { positions, colors, phases }
  }, [count, minR, maxR])

  useFrame((state) => {
    if (!ref.current) return
    // Parallax: layer offset opposite camera, scaled by parallax factor
    const px = -camera.position.x * parallax * 0.015
    const py = -camera.position.y * parallax * 0.015
    const pz = -camera.position.z * parallax * 0.015
    ref.current.position.set(px, py, pz)
    // Extremely slow galactic rotation for near stars only
    if (parallax > 0.3) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.0015 * parallax
    }
    if (matRef.current && twinkle > 0) {
      matRef.current.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uTwinkle: { value: twinkle },
      uSize: { value: size },
      uOpacity: { value: opacity },
    }),
    [twinkle, size, opacity]
  )

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aPhase" args={[phases, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        vertexColors
        uniforms={uniforms}
        vertexShader={`
          attribute float aPhase;
          attribute vec3 color;
          varying vec3 vColor;
          varying float vPhase;
          uniform float uSize;
          void main() {
            vColor = color;
            vPhase = aPhase;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = uSize * (180.0 / max(-mv.z, 0.1));
            gl_PointSize = clamp(gl_PointSize, 0.4, 3.5);
            gl_Position = projectionMatrix * mv;
          }
        `}
        fragmentShader={`
          varying vec3 vColor;
          varying float vPhase;
          uniform float uTime;
          uniform float uTwinkle;
          uniform float uOpacity;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            float d = length(c);
            if (d > 0.5) discard;
            float soft = 1.0 - smoothstep(0.0, 0.5, d);
            float tw = 1.0 - uTwinkle * 0.12 * (0.5 + 0.5 * sin(uTime * 1.8 + vPhase));
            gl_FragColor = vec4(vColor * tw, soft * soft * uOpacity);
          }
        `}
      />
    </points>
  )
}

function DistantGalaxies({ count = 36 }: { count?: number }) {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.3, 'rgba(180,190,230,0.25)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  const items = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        const r = 140 + Math.random() * 100
        return {
          pos: [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta) * 0.4,
            r * Math.cos(phi),
          ] as [number, number, number],
          scale: 1.5 + Math.random() * 5,
          rot: Math.random() * Math.PI,
          color: ['#8898c8', '#a090c0', '#90a8c0', '#c0b0a0'][Math.floor(Math.random() * 4)],
          opacity: 0.04 + Math.random() * 0.07,
        }
      }),
    [count]
  )

  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} scale={it.scale} rotation={[0, 0, it.rot]} frustumCulled>
          <planeGeometry args={[1, 0.5]} />
          <meshBasicMaterial
            map={tex}
            color={it.color}
            transparent
            opacity={it.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

function NebulaAndDust() {
  const group = useRef<THREE.Group>(null)
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 256
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,0.7)')
    g.addColorStop(0.4, 'rgba(255,255,255,0.2)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])

  // Nebulae (far, subtle) + dark molecular clouds
  const clouds = useMemo(() => {
    const list: {
      pos: [number, number, number]
      scale: number
      color: string
      opacity: number
      dark?: boolean
    }[] = []
    const nebulaColors = ['#1a1030', '#101828', '#201018', '#0c1828', '#181028']
    for (let i = 0; i < 12; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      const r = 100 + Math.random() * 80
      list.push({
        pos: [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta) * 0.35,
          r * Math.cos(phi),
        ],
        scale: 35 + Math.random() * 50,
        color: nebulaColors[i % nebulaColors.length],
        opacity: 0.025 + Math.random() * 0.035,
      })
    }
    // Dark dust (subtractive feel via low-opacity black planes — subtle)
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * Math.PI * 2
      const r = 90 + Math.random() * 60
      list.push({
        pos: [Math.cos(a) * r, (Math.random() - 0.5) * 20, Math.sin(a) * r],
        scale: 20 + Math.random() * 40,
        color: '#000000',
        opacity: 0.12 + Math.random() * 0.15,
        dark: true,
      })
    }
    return list
  }, [])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.0008
  })

  return (
    <group ref={group}>
      {clouds.map((c, i) => (
        <mesh key={i} position={c.pos} scale={c.scale} frustumCulled>
          <planeGeometry />
          <meshBasicMaterial
            map={tex}
            color={c.color}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            blending={c.dark ? THREE.NormalBlending : THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  )
}

/**
 * IMAX-style cosmic dust — fixed world-space layers, very slow drift.
 * Does NOT follow the camera (no snowfall / starfield-through-cabin feel).
 */
function CosmicDust() {
  const nearRef = useRef<THREE.Points>(null)
  const midRef = useRef<THREE.Points>(null)
  const farRef = useRef<THREE.Points>(null)
  const microRef = useRef<THREE.Points>(null)

  /** Spherical shell distribution — depth without clutter */
  const makeShell = (count: number, r0: number, r1: number, yScale = 0.45) => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const r = r0 + Math.random() * (r1 - r0)
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * yScale
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }

  const near = useMemo(() => makeShell(500, 8, 35, 0.4), [])
  const mid = useMemo(() => makeShell(1200, 30, 80, 0.42), [])
  const far = useMemo(() => makeShell(1800, 70, 160, 0.48), [])
  const micro = useMemo(() => makeShell(2500, 20, 200, 0.5), [])

  useFrame((_, delta) => {
    // Slow galactic rotation only — no per-particle camera chase
    if (nearRef.current) nearRef.current.rotation.y += delta * 0.004
    if (midRef.current) midRef.current.rotation.y += delta * 0.002
    if (farRef.current) farRef.current.rotation.y += delta * 0.0008
    if (microRef.current) {
      microRef.current.rotation.y += delta * 0.0005
      microRef.current.rotation.x += delta * 0.00015
    }
  })

  const pts = (
    ref: RefObject<THREE.Points | null>,
    positions: Float32Array,
    size: number,
    opacity: number,
    color: string
  ) => (
    <points ref={ref} frustumCulled>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={opacity}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )

  return (
    <group>
      {/* Nearby sparse motes */}
      {pts(nearRef, near, 0.028, 0.1, '#9aa8c0')}
      {/* Mid-field */}
      {pts(midRef, mid, 0.02, 0.07, '#7a88a8')}
      {/* Distant haze particles */}
      {pts(farRef, far, 0.014, 0.05, '#5a6890')}
      {/* Microscopic cosmic dust */}
      {pts(microRef, micro, 0.01, 0.035, '#4a5878')}
    </group>
  )
}

function Pulsars({ count = 5 }: { count?: number }) {
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const items = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const r = 100 + Math.random() * 90
        const theta = Math.random() * Math.PI * 2
        const phi = Math.random() * Math.PI
        return {
          pos: [
            r * Math.sin(phi) * Math.cos(theta),
            r * Math.sin(phi) * Math.sin(theta) * 0.45,
            r * Math.cos(phi),
          ] as [number, number, number],
          phase: Math.random() * Math.PI * 2,
          speed: 1.5 + Math.random() * 3,
        }
      }),
    [count]
  )

  useFrame(() => {
    items.forEach((it, i) => {
      const m = refs.current[i]
      if (!m) return
      const mat = m.material as THREE.MeshBasicMaterial
      mat.opacity =
        0.05 + Math.pow(Math.sin(performance.now() * 0.001 * it.speed + it.phase), 10) * 0.5
    })
  })

  return (
    <group>
      {items.map((it, i) => (
        <mesh
          key={i}
          position={it.pos}
          ref={(el) => {
            refs.current[i] = el
          }}
        >
          <sphereGeometry args={[0.25, 6, 6]} />
          <meshBasicMaterial
            color="#aaccff"
            transparent
            opacity={0.1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

function Comets() {
  const heads = useRef<(THREE.Mesh | null)[]>([null, null])
  const tails = useRef<(THREE.Mesh | null)[]>([null, null])
  const state = useRef(
    Array.from({ length: 2 }, () => ({
      active: false,
      t: 0,
      duration: 14,
      start: new THREE.Vector3(),
      end: new THREE.Vector3(),
      cooldown: 20 + Math.random() * 30,
    }))
  )

  useFrame((_, delta) => {
    state.current.forEach((c, idx) => {
      c.cooldown -= delta
      if (!c.active && c.cooldown <= 0) {
        c.active = true
        c.t = 0
        c.duration = 12 + Math.random() * 10
        const r = 70 + Math.random() * 50
        c.start.set(r, 15 + Math.random() * 25, (Math.random() - 0.5) * 90)
        c.end.set(-r, -8 - Math.random() * 15, (Math.random() - 0.5) * 70)
        c.cooldown = 50 + Math.random() * 80
      }
      const head = heads.current[idx]
      const tail = tails.current[idx]
      if (c.active && head && tail) {
        c.t += delta / c.duration
        const p = Math.min(1, c.t)
        const pos = new THREE.Vector3().lerpVectors(c.start, c.end, p)
        head.position.copy(pos)
        tail.position.copy(pos)
        tail.lookAt(c.end)
        const fade = Math.sin(p * Math.PI) * 0.5
        ;(head.material as THREE.MeshBasicMaterial).opacity = fade
        ;(tail.material as THREE.MeshBasicMaterial).opacity = fade * 0.35
        tail.scale.set(0.1, 0.1, 10 + fade * 14)
        if (c.t >= 1) c.active = false
      } else if (head && tail) {
        ;(head.material as THREE.MeshBasicMaterial).opacity = 0
        ;(tail.material as THREE.MeshBasicMaterial).opacity = 0
      }
    })
  })

  return (
    <group>
      {[0, 1].map((i) => (
        <group key={i}>
          <mesh ref={(el) => { heads.current[i] = el }}>
            <sphereGeometry args={[0.2, 10, 10]} />
            <meshBasicMaterial
              color="#e8f0ff"
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
          <mesh ref={(el) => { tails.current[i] = el }}>
            <coneGeometry args={[1, 1, 6]} />
            <meshBasicMaterial
              color="#7890b8"
              transparent
              opacity={0}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function DeepSpace() {
  return (
    <group>
      {/* Far stars — almost static, dense, faint */}
      <StarLayer count={22000} minR={120} maxR={280} size={0.55} parallax={0.05} twinkle={0.15} opacity={0.75} />
      {/* Mid stars */}
      <StarLayer count={12000} minR={60} maxR={140} size={0.75} parallax={0.25} twinkle={0.35} opacity={0.85} />
      {/* Near stars — parallax + slight twinkle */}
      <StarLayer count={6000} minR={30} maxR={80} size={1.1} parallax={0.7} twinkle={0.55} opacity={0.95} />
      {/* Bright sparse nearby */}
      <StarLayer count={1500} minR={25} maxR={55} size={1.6} parallax={0.9} twinkle={0.7} opacity={1} />

      <DistantGalaxies count={32} />
      <NebulaAndDust />
      <Pulsars count={5} />
      <Comets />
      <AsteroidBelt />
      <CosmicDust />
    </group>
  )
}
