import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Physically-inspired atmospheric limb (Rayleigh + Mie approximation).
 * Density scales intensity; sun at origin drives terminator colors.
 */
const atmVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjectPos;
  varying vec3 vViewDir;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vObjectPos = position;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorldPos = world.xyz;
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`

const atmFragment = /* glsl */ `
  uniform vec3 glowColor;
  uniform float intensity;
  uniform float power;
  uniform float time;
  uniform float aurora;
  uniform float density;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  varying vec3 vObjectPos;
  varying vec3 vViewDir;

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(vViewDir);
    float ndv = max(dot(viewDir, n), 0.0);
    float fresnel = pow(1.0 - ndv, power);

    // Sun at origin
    vec3 toSun = normalize(-vWorldPos);
    float ndl = dot(n, toSun);

    // Soft penumbra terminator
    float day = smoothstep(-0.15, 0.35, ndl);
    float dusk = exp(-pow(ndl * 4.0, 2.0));
    float night = 1.0 - day;
    float backlit = pow(max(-ndl, 0.0), 1.35);

    // Rayleigh (blue limb) + Mie (warm forward scatter at dusk)
    vec3 rayleigh = glowColor * (0.55 + fresnel * 0.8);
    vec3 mie = vec3(1.0, 0.72, 0.42) * dusk * fresnel;
    vec3 sunset = vec3(1.0, 0.45, 0.15) * dusk * dusk * 0.9;

    vec3 col = rayleigh * density;
    col += mie * density * 0.7;
    col += sunset * density;
    col += glowColor * backlit * fresnel * 0.55 * density;
    // Day-side subtle scatter
    col += glowColor * day * fresnel * 0.2 * density;

    float alpha = fresnel * intensity * density;
    alpha *= 0.65 + backlit * 0.45 + dusk * 0.35 + day * 0.15;
    alpha = clamp(alpha, 0.0, 0.92);

    if (aurora > 0.01) {
      float pole = pow(abs(normalize(vObjectPos).y), 4.5);
      float wave = 0.5 + 0.5 * sin(vObjectPos.x * 7.0 + time * 1.1);
      float wave2 = 0.5 + 0.5 * sin(vObjectPos.z * 5.0 - time * 0.85);
      float aur = pole * wave * wave2 * aurora * night;
      col += vec3(0.12, 0.85, 0.48) * aur;
      col += vec3(0.3, 0.15, 0.85) * aur * 0.3;
      alpha += aur * 0.22;
    }

    gl_FragColor = vec4(col, alpha);
  }
`

interface AtmosphereProps {
  radius: number
  color?: string
  intensity?: number
  power?: number
  scale?: number
  aurora?: number
  /** Relative atmosphere density (Earth ≈ 1) */
  density?: number
}

export function Atmosphere({
  radius,
  color = '#5eb0ff',
  intensity = 0.75,
  power = 2.85,
  scale = 1.09,
  aurora = 0,
  density = 1,
}: AtmosphereProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null)

  useFrame((_, delta) => {
    if (matRef.current) matRef.current.uniforms.time.value += delta
  })

  return (
    <mesh scale={scale} renderOrder={2} frustumCulled>
      <sphereGeometry args={[radius, 56, 56]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={atmVertex}
        fragmentShader={atmFragment}
        uniforms={{
          glowColor: { value: new THREE.Color(color) },
          intensity: { value: intensity },
          power: { value: power },
          time: { value: 0 },
          aurora: { value: aurora },
          density: { value: density },
        }}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export function ScatteringShell({
  radius,
  color = '#7ec8ff',
  scale = 1.16,
  opacity = 0.035,
}: {
  radius: number
  color?: string
  scale?: number
  opacity?: number
}) {
  return (
    <mesh scale={scale} renderOrder={1} frustumCulled>
      <sphereGeometry args={[radius, 40, 40]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

/** Subtle limb rim — grazing-angle enhancement */
export function RimLight({
  radius,
  color,
}: {
  radius: number
  color: string
}) {
  return (
    <mesh scale={1.04} renderOrder={3} frustumCulled>
      <sphereGeometry args={[radius, 48, 48]} />
      <shaderMaterial
        transparent
        depthWrite={false}
        side={THREE.FrontSide}
        blending={THREE.AdditiveBlending}
        vertexShader={`
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vN = normalize(normalMatrix * normal);
            vec4 w = modelMatrix * vec4(position, 1.0);
            vW = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }
        `}
        fragmentShader={`
          uniform vec3 color;
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vec3 viewDir = normalize(cameraPosition - vW);
            vec3 n = normalize(vN);
            float fres = pow(1.0 - max(dot(viewDir, n), 0.0), 3.4);
            vec3 toSun = normalize(-vW);
            float ndl = dot(n, toSun);
            float penumbra = exp(-pow(ndl * 3.2, 2.0));
            float back = pow(max(-ndl, 0.0), 1.25);
            // Soft self-shadow: night side rim muted
            float dayGate = smoothstep(-0.2, 0.25, ndl);
            float a = fres * (0.06 * dayGate + back * 0.28 + penumbra * 0.12);
            vec3 col = mix(color, vec3(1.0, 0.75, 0.45), penumbra * 0.5);
            gl_FragColor = vec4(col, a);
          }
        `}
        uniforms={{ color: { value: new THREE.Color(color) } }}
      />
    </mesh>
  )
}
