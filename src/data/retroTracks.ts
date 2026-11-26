export type MusicStyle = 'ambient' | 'retro'

export type RetroTrack = {
  id: string
  title: string
  artist: string
  /** Path relative to the Vite public root (served with BASE_URL). */
  file: string
  license: 'CC BY 4.0' | 'CC0 1.0'
  licenseUrl: string
  sourceUrl: string
  attribution: string
}

/**
 * 80s American synth / new-wave / arcade playlist.
 * Only tracks with a clear license allowing redistribution in a public web app.
 */
export const RETRO_TRACKS: RetroTrack[] = [
  {
    id: 'eighties-action',
    title: 'Eighties Action',
    artist: 'Kevin MacLeod',
    file: 'music/eighties-action.mp3',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100243',
    attribution:
      'Eighties Action by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License — https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'newer-wave',
    title: 'Newer Wave',
    artist: 'Kevin MacLeod',
    file: 'music/newer-wave.mp3',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN2000024',
    attribution:
      'Newer Wave by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License — https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'laser-groove',
    title: 'Laser Groove',
    artist: 'Kevin MacLeod',
    file: 'music/laser-groove.mp3',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1700017',
    attribution:
      'Laser Groove by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License — https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'rhinoceros',
    title: 'Rhinoceros',
    artist: 'Kevin MacLeod',
    file: 'music/rhinoceros.mp3',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    sourceUrl: 'https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1500040',
    attribution:
      'Rhinoceros by Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0 License — https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 'eighties-synth-wave',
    title: "80's Synth Wave",
    artist: 'Pro Sensory',
    file: 'music/eighties-synth-wave.mp3',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    sourceUrl: 'https://opengameart.org/content/80s-synth-wave',
    attribution:
      "80's Synth Wave by Pro Sensory — released under CC0 1.0 Universal (public domain dedication) — https://opengameart.org/content/80s-synth-wave",
  },
]

export function publicAudioUrl(file: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}${file.replace(/^\//, '')}`
}
