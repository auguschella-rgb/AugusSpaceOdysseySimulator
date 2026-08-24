/**
 * Dynamic original cinematic soundtrack with layered beds.
 * Near Sun/Earth → hopeful; deep space / outer planets → darker, mysterious.
 * Seamless looping, no copyrighted material.
 */

export type MusicZone = 'solar' | 'earth' | 'outer' | 'deep'

export class AmbientEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private zoneGains: Record<MusicZone, GainNode> | null = null
  private warpGain: GainNode | null = null
  private nodes: AudioNode[] = []
  private intervals: number[] = []
  private started = false
  private volume = 0.35
  private targetZone: MusicZone = 'earth'
  private warpIntensity = 0

  async ensureContext() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0
      this.master.connect(this.ctx.destination)

      this.zoneGains = {
        solar: this.ctx.createGain(),
        earth: this.ctx.createGain(),
        outer: this.ctx.createGain(),
        deep: this.ctx.createGain(),
      }
      Object.values(this.zoneGains).forEach((g) => {
        g.gain.value = 0
        g.connect(this.master!)
      })
      // Warp epic layer (additive, keeps existing beds)
      this.warpGain = this.ctx.createGain()
      this.warpGain.gain.value = 0
      this.warpGain.connect(this.master!)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master && this.started) {
      this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx!.currentTime, 0.08)
    }
  }

  /**
   * Update musical atmosphere from camera distance to sun and focus body.
   * dist: camera distance from origin (sun)
   * focusId: selected/focused planet id
   */
  setAtmosphere(dist: number, focusId: string | null) {
    let zone: MusicZone = 'earth'
    if (focusId === 'earth' || focusId === 'moon') zone = 'earth'
    else if (focusId === 'jupiter' || focusId === 'saturn') zone = 'outer'
    else if (focusId === 'uranus' || focusId === 'neptune' || focusId === 'pluto') zone = 'deep'
    else if (focusId === 'sun' || focusId === 'mercury' || focusId === 'venus') zone = 'solar'
    else if (dist < 22) zone = 'solar'
    else if (dist < 42) zone = 'earth'
    else if (dist < 72) zone = 'outer'
    else zone = 'deep'

    // Quiet near moon
    if (focusId === 'moon') zone = 'earth'

    if (zone !== this.targetZone) {
      this.targetZone = zone
      this.crossfadeZones(zone)
    }
  }

  /**
   * Additive warp intensity 0–1 — builds epic layer without replacing zones.
   */
  setWarpIntensity(v: number) {
    this.warpIntensity = Math.max(0, Math.min(1, v))
    if (!this.warpGain || !this.ctx || !this.started) return
    this.warpGain.gain.setTargetAtTime(
      this.warpIntensity * 0.22,
      this.ctx.currentTime,
      0.6
    )
  }

  private crossfadeZones(zone: MusicZone) {
    if (!this.zoneGains || !this.ctx) return
    const t = this.ctx.currentTime
    const timeConst = 1.6
    ;(Object.keys(this.zoneGains) as MusicZone[]).forEach((z) => {
      const g = this.zoneGains![z]
      const target = z === zone ? 1 : 0
      g.gain.cancelScheduledValues(t)
      g.gain.setTargetAtTime(target, t, timeConst)
    })
  }

  async start() {
    const ctx = await this.ensureContext()
    if (this.started) {
      this.master!.gain.setTargetAtTime(this.volume * 0.5, ctx.currentTime, 0.5)
      return
    }
    this.started = true
    const zg = this.zoneGains!

    // Shared deep space ambience (always under everything)
    this.addPad(ctx, this.master!, 42, 'sine', 0.05, 0.0004)
    this.addPad(ctx, this.master!, 63, 'sine', 0.025, 0.0003)
    this.addAtmosphereNoise(ctx, this.master!, 0.01)

    // SOLAR — powerful orchestral tension (low brass-like + rising pads)
    this.addPad(ctx, zg.solar, 55, 'sawtooth', 0.018, 0.0004)
    this.addPad(ctx, zg.solar, 82.41, 'sine', 0.06, 0.0007)
    this.addPad(ctx, zg.solar, 164.81, 'triangle', 0.035, 0.0009)
    this.addPad(ctx, zg.solar, 246.94, 'sine', 0.028, 0.001)
    this.addChoir(ctx, zg.solar, [196, 246.94, 311.13, 392], 0.016)
    this.scheduleSparseNotes(ctx, zg.solar, [110, 146.83, 185, 220, 293.66], 0.03, 11000)

    // EARTH — hopeful, gentle major character
    this.addPad(ctx, zg.earth, 110, 'sine', 0.065, 0.001)
    this.addPad(ctx, zg.earth, 164.81, 'sine', 0.04, 0.0009)
    this.addPad(ctx, zg.earth, 220, 'triangle', 0.032, 0.0007)
    this.addPad(ctx, zg.earth, 329.63, 'sine', 0.018, 0.0006)
    this.addChoir(ctx, zg.earth, [329.63, 415.3, 493.88, 587.33], 0.018)
    this.scheduleSparseNotes(ctx, zg.earth, [220, 277.18, 329.63, 440, 554.37], 0.03, 9500)
    this.addSoftPulse(ctx, zg.earth, 0.006)

    // OUTER (Jupiter/Saturn) — mysterious
    this.addPad(ctx, zg.outer, 61.74, 'sine', 0.085, 0.00055)
    this.addPad(ctx, zg.outer, 92.5, 'sine', 0.05, 0.00075)
    this.addPad(ctx, zg.outer, 138.59, 'triangle', 0.028, 0.0009)
    this.addChoir(ctx, zg.outer, [185, 233.08, 277.18], 0.017)
    this.scheduleSparseNotes(ctx, zg.outer, [138.59, 174.61, 207.65, 277.18], 0.02, 15000)

    // DEEP — dark ambient void
    this.addPad(ctx, zg.deep, 32.7, 'sine', 0.12, 0.00035)
    this.addPad(ctx, zg.deep, 49, 'sine', 0.07, 0.00045)
    this.addPad(ctx, zg.deep, 73.42, 'triangle', 0.028, 0.0005)
    this.addChoir(ctx, zg.deep, [98, 123.47, 146.83], 0.012)
    this.scheduleSparseNotes(ctx, zg.deep, [73.42, 92.5, 110, 146.83], 0.016, 18000)
    this.addAtmosphereNoise(ctx, zg.deep, 0.006)

    // WARP — epic rising bed (gain controlled by setWarpIntensity)
    if (this.warpGain) {
      this.addPad(ctx, this.warpGain, 55, 'sawtooth', 0.02, 0.0005)
      this.addPad(ctx, this.warpGain, 110, 'triangle', 0.03, 0.0008)
      this.addChoir(ctx, this.warpGain, [220, 277, 330, 440], 0.02)
      this.addAtmosphereNoise(ctx, this.warpGain, 0.012)
    }

    // Start with earth zone
    zg.earth.gain.value = 1
    this.master!.gain.setValueAtTime(0, ctx.currentTime)
    this.master!.gain.linearRampToValueAtTime(this.volume * 0.5, ctx.currentTime + 3.5)
  }

  stop() {
    if (!this.ctx || !this.master || !this.started) return
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.5)
  }

  async toggle(on: boolean) {
    if (on) await this.start()
    else this.stop()
  }

  dispose() {
    this.intervals.forEach((id) => clearInterval(id))
    this.intervals = []
    this.nodes.forEach((n) => {
      try {
        n.disconnect()
      } catch {
        /* */
      }
    })
    this.nodes = []
    if (this.ctx) {
      void this.ctx.close()
      this.ctx = null
      this.master = null
      this.zoneGains = null
    }
    this.started = false
  }

  private addPad(
    ctx: AudioContext,
    dest: AudioNode,
    freq: number,
    type: OscillatorType,
    gain: number,
    lfoDepth: number
  ) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const lfo = ctx.createOscillator()
    const lfoG = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = type
    osc.frequency.value = freq
    filter.type = 'lowpass'
    filter.frequency.value = 900
    filter.Q.value = 0.4
    g.gain.value = gain
    lfo.type = 'sine'
    lfo.frequency.value = 0.04 + Math.random() * 0.03
    lfoG.gain.value = lfoDepth * freq

    lfo.connect(lfoG)
    lfoG.connect(osc.frequency)
    osc.connect(filter)
    filter.connect(g)
    g.connect(dest)

    osc.start()
    lfo.start()
    this.nodes.push(osc, g, lfo, lfoG, filter)
  }

  private addChoir(ctx: AudioContext, dest: AudioNode, freqs: number[], gain: number) {
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = f
      osc.detune.value = (i - 1) * 5
      g.gain.value = gain

      const lfo = ctx.createOscillator()
      const lfoG = ctx.createGain()
      lfo.frequency.value = 0.025 + i * 0.008
      lfoG.gain.value = gain * 0.35
      lfo.connect(lfoG)
      lfoG.connect(g.gain)

      osc.connect(g)
      g.connect(dest)
      osc.start()
      lfo.start()
      this.nodes.push(osc, g, lfo, lfoG)
    })
  }

  private addAtmosphereNoise(ctx: AudioContext, dest: AudioNode, gain: number) {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5
    const noise = ctx.createBufferSource()
    noise.buffer = buffer
    noise.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 380
    filter.Q.value = 0.35
    const g = ctx.createGain()
    g.gain.value = gain
    noise.connect(filter)
    filter.connect(g)
    g.connect(dest)
    noise.start()
    this.nodes.push(noise, filter, g)
  }

  private addSoftPulse(_ctx: AudioContext, dest: AudioNode, gain: number) {
    // Very subtle slow percussion (heartbeat of space)
    const id = window.setInterval(() => {
      if (!this.started || !this.ctx) return
      const t = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      const f = this.ctx.createBiquadFilter()
      osc.type = 'sine'
      osc.frequency.value = 48
      f.type = 'lowpass'
      f.frequency.value = 120
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(gain, t + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2)
      osc.connect(f)
      f.connect(g)
      g.connect(dest)
      osc.start(t)
      osc.stop(t + 1.3)
    }, 4800)
    this.intervals.push(id)
  }

  private scheduleSparseNotes(
    ctx: AudioContext,
    dest: AudioNode,
    scale: number[],
    gain: number,
    intervalMs: number
  ) {
    const playNote = () => {
      if (!this.started || !this.ctx) return
      const freq = scale[Math.floor(Math.random() * scale.length)]
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const filter = ctx.createBiquadFilter()
      osc.type = 'sine'
      osc.frequency.value = freq
      filter.type = 'lowpass'
      filter.frequency.value = 1400
      const now = ctx.currentTime
      g.gain.setValueAtTime(0, now)
      g.gain.linearRampToValueAtTime(gain, now + 1.8)
      g.gain.exponentialRampToValueAtTime(0.001, now + 9)
      osc.connect(filter)
      filter.connect(g)
      g.connect(dest)
      osc.start(now)
      osc.stop(now + 10)
    }
    const id = window.setInterval(() => {
      if (Math.random() > 0.4) playNote()
    }, intervalMs)
    this.intervals.push(id)
  }
}

export const ambientEngine = new AmbientEngine()
