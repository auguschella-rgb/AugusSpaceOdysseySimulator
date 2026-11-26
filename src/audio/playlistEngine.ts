import { publicAudioUrl, RETRO_TRACKS, type RetroTrack } from '../data/retroTracks'

export type PlaylistListener = (track: RetroTrack | null, playing: boolean) => void

/**
 * Lazy HTMLAudioElement playlist for the 80s Retro soundtrack.
 * Tracks are loaded only when music is on (preload="none").
 */
export class PlaylistEngine {
  private audio: HTMLAudioElement | null = null
  private index = 0
  private volume = 0.35
  private active = false
  private skipStreak = 0
  private listeners = new Set<PlaylistListener>()

  subscribe(fn: PlaylistListener): () => void {
    this.listeners.add(fn)
    fn(this.getCurrentTrack(), this.isPlaying())
    return () => {
      this.listeners.delete(fn)
    }
  }

  getCurrentTrack(): RetroTrack | null {
    return RETRO_TRACKS[this.index] ?? null
  }

  isPlaying(): boolean {
    return this.active && !!this.audio && !this.audio.paused
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.audio) this.audio.volume = this.volume
  }

  start() {
    this.active = true
    const audio = this.ensureAudio()
    this.load(this.index)
    audio.volume = this.volume
    const playResult = audio.play()
    if (playResult && typeof playResult.then === 'function') {
      void playResult.catch(() => {
        // Autoplay may be blocked; the existing Music toggle can retry after a gesture.
      })
    }
    this.emit()
  }

  stop() {
    this.active = false
    if (this.audio) {
      this.audio.pause()
      this.audio.removeAttribute('src')
      this.audio.load()
    }
    this.emit()
  }

  next() {
    if (RETRO_TRACKS.length === 0) return
    this.index = (this.index + 1) % RETRO_TRACKS.length
    if (!this.active) {
      this.emit()
      return
    }
    this.load(this.index)
    const audio = this.ensureAudio()
    audio.volume = this.volume
    void audio.play().catch(() => {
      /* ignore */
    })
    this.emit()
  }

  dispose() {
    this.stop()
    if (this.audio) {
      this.audio.removeEventListener('ended', this.onEnded)
      this.audio.removeEventListener('error', this.onError)
      this.audio.removeEventListener('playing', this.onPlaying)
      this.audio = null
    }
    this.listeners.clear()
  }

  private ensureAudio(): HTMLAudioElement {
    if (this.audio) return this.audio
    const audio = new Audio()
    audio.preload = 'none'
    audio.loop = false
    audio.addEventListener('ended', this.onEnded)
    audio.addEventListener('error', this.onError)
    audio.addEventListener('playing', this.onPlaying)
    this.audio = audio
    return audio
  }

  private load(index: number) {
    const track = RETRO_TRACKS[index]
    if (!track) return
    const audio = this.ensureAudio()
    audio.preload = 'none'
    audio.src = publicAudioUrl(track.file)
  }

  private onEnded = () => {
    this.skipStreak = 0
    this.next()
  }

  private onPlaying = () => {
    this.skipStreak = 0
    this.emit()
  }

  private onError = () => {
    if (!this.active) return
    this.skipStreak += 1
    if (this.skipStreak >= RETRO_TRACKS.length) {
      this.stop()
      return
    }
    this.next()
  }

  private emit() {
    const track = this.getCurrentTrack()
    const playing = this.isPlaying()
    this.listeners.forEach((fn) => fn(track, playing))
  }
}

export const playlistEngine = new PlaylistEngine()
