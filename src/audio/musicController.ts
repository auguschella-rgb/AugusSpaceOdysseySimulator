import type { MusicStyle } from '../data/retroTracks'
import { ambientEngine } from './ambientEngine'
import { playlistEngine } from './playlistEngine'

/**
 * Routes play/pause and volume between the original ambient engine
 * and the 80s Retro playlist. Callers should not await start/toggle
 * so UI (including Begin Exploration) is never blocked on audio.
 */
export const musicController = {
  setVolume(v: number) {
    ambientEngine.setVolume(v)
    playlistEngine.setVolume(v)
  },

  start(style: MusicStyle) {
    if (style === 'ambient') {
      playlistEngine.stop()
      void ambientEngine.start()
    } else {
      ambientEngine.stop()
      playlistEngine.start()
    }
  },

  stop() {
    ambientEngine.stop()
    playlistEngine.stop()
  },

  toggle(on: boolean, style: MusicStyle) {
    if (on) this.start(style)
    else this.stop()
  },

  setStyle(style: MusicStyle, enabled: boolean) {
    if (!enabled) {
      this.stop()
      return
    }
    this.start(style)
  },

  next() {
    playlistEngine.next()
  },

  dispose() {
    playlistEngine.dispose()
    ambientEngine.dispose()
  },
}
