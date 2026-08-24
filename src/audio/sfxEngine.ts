/**
 * Subtle UI / spacecraft SFX — original, soft, elegant.
 */
export class SfxEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private enabled = true
  private volume = 0.25

  async ensure() {
    if (!this.ctx) {
      this.ctx = new AudioContext()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.volume
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume()
    return this.ctx
  }

  setEnabled(v: boolean) {
    this.enabled = v
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master) this.master.gain.value = this.volume * 0.4
  }

  async playUiTap() {
    if (!this.enabled) return
    const ctx = await this.ensure()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(880, t)
    osc.frequency.exponentialRampToValueAtTime(440, t + 0.08)
    g.gain.setValueAtTime(0.04, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
    osc.connect(g)
    g.connect(this.master!)
    osc.start(t)
    osc.stop(t + 0.15)
  }

  async playSelect() {
    if (!this.enabled) return
    const ctx = await this.ensure()
    const t = ctx.currentTime
    // Soft two-tone chime
    ;[523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      const f = ctx.createBiquadFilter()
      osc.type = 'sine'
      osc.frequency.value = freq
      f.type = 'lowpass'
      f.frequency.value = 2000
      g.gain.setValueAtTime(0, t + i * 0.06)
      g.gain.linearRampToValueAtTime(0.045, t + i * 0.06 + 0.04)
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.5)
      osc.connect(f)
      f.connect(g)
      g.connect(this.master!)
      osc.start(t + i * 0.06)
      osc.stop(t + i * 0.06 + 0.55)
    })
  }

  async playTimeline() {
    if (!this.enabled) return
    const ctx = await this.ensure()
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = 'triangle'
    osc.frequency.value = 220 + Math.random() * 40
    g.gain.setValueAtTime(0.02, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08)
    osc.connect(g)
    g.connect(this.master!)
    osc.start(t)
    osc.stop(t + 0.1)
  }

  /** Continuous soft spacecraft hum */
  private humNodes: AudioNode[] = []
  private humming = false

  async startHum() {
    if (this.humming) return
    const ctx = await this.ensure()
    this.humming = true
    const osc = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const g = ctx.createGain()
    const f = ctx.createBiquadFilter()
    osc.type = 'sine'
    osc2.type = 'sine'
    osc.frequency.value = 55
    osc2.frequency.value = 82.5
    f.type = 'lowpass'
    f.frequency.value = 200
    g.gain.value = 0.012
    osc.connect(f)
    osc2.connect(f)
    f.connect(g)
    g.connect(this.master!)
    osc.start()
    osc2.start()
    this.humNodes = [osc, osc2, g, f]
  }

  stopHum() {
    this.humNodes.forEach((n) => {
      try {
        if ('stop' in n && typeof (n as OscillatorNode).stop === 'function') {
          ;(n as OscillatorNode).stop()
        }
        n.disconnect()
      } catch {
        /* */
      }
    })
    this.humNodes = []
    this.humming = false
  }

  dispose() {
    this.stopHum()
    void this.ctx?.close()
    this.ctx = null
  }
}

export const sfxEngine = new SfxEngine()
