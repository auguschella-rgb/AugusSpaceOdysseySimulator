/** Lightweight deterministic noise for offline PBR texture synthesis */

export function hash2(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

export function smoothNoise(x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const a = hash2(x0, y0)
  const b = hash2(x0 + 1, y0)
  const c = hash2(x0, y0 + 1)
  const d = hash2(x0 + 1, y0 + 1)
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy
}

export function fbm(x: number, y: number, octaves = 5): number {
  let v = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    v += a * smoothNoise(x * f, y * f)
    a *= 0.5
    f *= 2
  }
  return v
}

export function ridged(x: number, y: number, octaves = 4): number {
  let v = 0
  let a = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(smoothNoise(x * f, y * f) * 2 - 1)
    v += n * n * a
    a *= 0.5
    f *= 2
  }
  return v
}

export function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function mixColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number
): [number, number, number] {
  return [
    Math.round(lerp(c1[0], c2[0], t)),
    Math.round(lerp(c1[1], c2[1], t)),
    Math.round(lerp(c1[2], c2[2], t)),
  ]
}
