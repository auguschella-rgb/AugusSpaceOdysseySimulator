import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSimulatorStore } from '../../store/useSimulatorStore'
import { musicController } from '../../audio/musicController'
import { playlistEngine } from '../../audio/playlistEngine'
import { sfxEngine } from '../../audio/sfxEngine'
import { isFullscreen, toggleFullscreen } from '../../utils/fullscreen'
import { RETRO_TRACKS, type MusicStyle, type RetroTrack } from '../../data/retroTracks'

function PanelShell({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      data-asos-ui
      className="glass-panel fixed top-20 left-1/2 -translate-x-1/2 z-40 w-[min(100vw-2rem,420px)] rounded-2xl overflow-hidden"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <h3 className="font-display text-sm tracking-[0.15em] uppercase text-white">
          {title}
        </h3>
        <button
          type="button"
          className="glass-button w-8 h-8 rounded-lg flex items-center justify-center"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="px-5 py-4 text-sm text-white/75 leading-relaxed panel-scroll max-h-[60vh] overflow-y-auto">
        {children}
      </div>
    </motion.div>
  )
}

function SettingsPanel() {
  const showOrbits = useSimulatorStore((s) => s.showOrbits)
  const setShowOrbits = useSimulatorStore((s) => s.setShowOrbits)
  const showLabels = useSimulatorStore((s) => s.showLabels)
  const setShowLabels = useSimulatorStore((s) => s.setShowLabels)
  const filmGrain = useSimulatorStore((s) => s.filmGrain)
  const setFilmGrain = useSimulatorStore((s) => s.setFilmGrain)
  const cinematicMode = useSimulatorStore((s) => s.cinematicMode)
  const setCinematicMode = useSimulatorStore((s) => s.setCinematicMode)
  const sfxEnabled = useSimulatorStore((s) => s.sfxEnabled)
  const setSfxEnabled = useSimulatorStore((s) => s.setSfxEnabled)
  const setActivePanel = useSimulatorStore((s) => s.setActivePanel)
  const isFs = useSimulatorStore((s) => s.isFullscreen)
  const setIsFullscreen = useSimulatorStore((s) => s.setIsFullscreen)
  const setPreferFullscreen = useSimulatorStore((s) => s.setPreferFullscreen)

  return (
    <PanelShell
      title="Settings"
      onClose={() => {
        void sfxEngine.playUiTap()
        setActivePanel(null)
      }}
    >
      <div className="space-y-4">
        <button
          type="button"
          className="glass-button w-full py-2.5 rounded-xl text-[11px] tracking-[0.15em] uppercase"
          onClick={() => {
            void sfxEngine.playUiTap()
            void toggleFullscreen(document.documentElement).then((fs) => {
              setIsFullscreen(fs)
              setPreferFullscreen(fs)
            })
          }}
        >
          {isFs || isFullscreen() ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        </button>
        <p className="text-[10px] text-white/35 -mt-2">
          Shortcut: F11 · Double-click empty space · Esc to exit
        </p>
        <ToggleRow
          label="Orbital Paths"
          description="Show faint orbital trajectories"
          checked={showOrbits}
          onChange={(v) => {
            void sfxEngine.playUiTap()
            setShowOrbits(v)
          }}
        />
        <ToggleRow
          label="Body Labels"
          description="Display names above planets"
          checked={showLabels}
          onChange={(v) => {
            void sfxEngine.playUiTap()
            setShowLabels(v)
          }}
        />
        <ToggleRow
          label="Cinematic Camera"
          description="Interstellar-style inertia, slower fly-to, gentle drift"
          checked={cinematicMode}
          onChange={(v) => {
            void sfxEngine.playUiTap()
            setCinematicMode(v)
          }}
        />
        <ToggleRow
          label="Photo Film Grain"
          description="Subtle grain when Photo Mode is active"
          checked={filmGrain}
          onChange={(v) => {
            void sfxEngine.playUiTap()
            setFilmGrain(v)
          }}
        />
        <ToggleRow
          label="Interface Sounds"
          description="Subtle UI and selection audio"
          checked={sfxEnabled}
          onChange={(v) => {
            setSfxEnabled(v)
            sfxEngine.setEnabled(v)
            if (v) void sfxEngine.playUiTap()
          }}
        />
        <p className="text-[11px] text-white/40 pt-2 border-t border-white/5">
          Left-drag orbit · Middle-drag pan · Right-drag free orbit · Scroll zoom.
          Select planets from the list below (or double-click a body). Single-click
          never steals focus while orbiting.
        </p>
      </div>
    </PanelShell>
  )
}

function MusicPanel() {
  const musicEnabled = useSimulatorStore((s) => s.musicEnabled)
  const setMusicEnabled = useSimulatorStore((s) => s.setMusicEnabled)
  const musicVolume = useSimulatorStore((s) => s.musicVolume)
  const setMusicVolume = useSimulatorStore((s) => s.setMusicVolume)
  const musicStyle = useSimulatorStore((s) => s.musicStyle)
  const setMusicStyle = useSimulatorStore((s) => s.setMusicStyle)
  const setActivePanel = useSimulatorStore((s) => s.setActivePanel)
  const [currentTrack, setCurrentTrack] = useState<RetroTrack | null>(
    playlistEngine.getCurrentTrack(),
  )

  useEffect(() => {
    musicController.setVolume(musicVolume)
  }, [musicVolume])

  useEffect(() => {
    return playlistEngine.subscribe((track) => {
      setCurrentTrack(track)
    })
  }, [])

  const handleToggle = (on: boolean) => {
    void sfxEngine.playUiTap()
    setMusicEnabled(on)
    musicController.toggle(on, musicStyle)
  }

  const handleStyle = (style: MusicStyle) => {
    if (style === musicStyle) return
    void sfxEngine.playUiTap()
    setMusicStyle(style)
    musicController.setStyle(style, musicEnabled)
  }

  return (
    <PanelShell
      title="Music"
      onClose={() => {
        void sfxEngine.playUiTap()
        setActivePanel(null)
      }}
    >
      <div className="space-y-5">
        <p className="text-[12px] text-white/55">
          Choose the original cinematic ambient score, or an 80s Retro playlist of
          licensed synth, new-wave and arcade tracks. No copyrighted commercial
          recordings.
        </p>
        <div>
          <p className="text-[11px] tracking-[0.15em] uppercase text-space-muted mb-2">
            Style
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`glass-button py-2 rounded-xl text-[11px] tracking-[0.12em] uppercase ${
                musicStyle === 'retro' ? 'active' : ''
              }`}
              aria-pressed={musicStyle === 'retro'}
              onClick={() => handleStyle('retro')}
            >
              80s Retro
            </button>
            <button
              type="button"
              className={`glass-button py-2 rounded-xl text-[11px] tracking-[0.12em] uppercase ${
                musicStyle === 'ambient' ? 'active' : ''
              }`}
              aria-pressed={musicStyle === 'ambient'}
              onClick={() => handleStyle('ambient')}
            >
              Ambient (original)
            </button>
          </div>
        </div>
        {musicStyle === 'ambient' ? (
          <p className="text-[12px] text-white/45">
            Dynamic original score with smooth zone crossfades: hopeful near Earth,
            mysterious near Jupiter, dark ambient in deep space, and powerful
            tension near the Sun.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] tracking-[0.15em] uppercase text-space-muted">
                  Now playing
                </p>
                <p className="text-[13px] text-white/90 truncate">
                  {currentTrack?.title ?? '80s Retro playlist'}
                </p>
                <p className="text-[11px] text-white/45 truncate">
                  {currentTrack
                    ? `${currentTrack.artist} · ${currentTrack.license}`
                    : 'Licensed CC BY / CC0 tracks'}
                </p>
              </div>
              <button
                type="button"
                className="glass-button shrink-0 px-3 py-2 rounded-xl text-[11px] tracking-[0.12em] uppercase"
                onClick={() => {
                  void sfxEngine.playUiTap()
                  musicController.next()
                }}
                aria-label="Next track"
              >
                Next
              </button>
            </div>
            <p className="text-[10px] text-white/35 leading-relaxed">
              Credits are listed in About. Tracks by Kevin MacLeod (incompetech.com)
              use CC BY 4.0; 80&apos;s Synth Wave by Pro Sensory is CC0.
            </p>
          </div>
        )}
        <ToggleRow
          label="Music"
          description={musicEnabled ? 'Soundtrack active' : 'Soundtrack muted'}
          checked={musicEnabled}
          onChange={handleToggle}
        />
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-[11px] tracking-[0.15em] uppercase text-space-muted">
              Volume
            </span>
            <span className="text-[11px] tabular-nums text-white/50">
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={musicVolume}
            onChange={(e) => setMusicVolume(Number(e.target.value))}
            className="space-slider"
            aria-label="Music volume"
          />
        </div>
      </div>
    </PanelShell>
  )
}

function HelpPanel() {
  const setActivePanel = useSimulatorStore((s) => s.setActivePanel)
  return (
    <PanelShell title="Mission Help" onClose={() => setActivePanel(null)}>
      <ul className="space-y-3 text-[12px]">
        <li>
          <strong className="text-white/90">Explore</strong> — Left-drag to
          rotate the view. Scroll to zoom. Right-drag to pan.
        </li>
        <li>
          <strong className="text-white/90">Select</strong> — Use the planet
          list or double-click a body. Dragging never changes selection.
        </li>
        <li>
          <strong className="text-white/90">Fullscreen</strong> — Settings,
          F11, or double-click empty space. Esc exits.
        </li>
        <li>
          <strong className="text-white/90">Exploration</strong> — Left HUD:
          Spacecraft mode, search, Travel, Warp, camera modes. Double-click
          probes for mission dossiers.
        </li>
        <li>
          <strong className="text-white/90">Timeline</strong> — Drag the year
          slider (1990–2100) to shift orbital positions.
        </li>
        <li>
          <strong className="text-white/90">Speed</strong> — Adjust simulation
          speed, pause, or reset from the lower-left console.
        </li>
        <li>
          <strong className="text-white/90">Photo Mode</strong> — Hide the entire
          interface for clean screenshots of deep space.
        </li>
        <li>
          <strong className="text-white/90">Music</strong> — Toggle the soundtrack,
          pick Ambient or 80s Retro, and set volume from the Music panel.
        </li>
      </ul>
    </PanelShell>
  )
}

function AboutPanel() {
  const setActivePanel = useSimulatorStore((s) => s.setActivePanel)
  return (
    <PanelShell title="About" onClose={() => setActivePanel(null)}>
      <div className="space-y-3 text-[12px]">
        <p className="font-display text-space-accent tracking-wide">
          Augus Space Odyssey Simulator
        </p>
        <p className="text-space-gold/80 tracking-[0.2em] uppercase text-[10px]">
          Journey Beyond Reality
        </p>
        <p>
          Mission Alpha 3.0 — Solar System Explorer with NASA scientific imagery
          integration. Mission-control UI for navigating our solar neighborhood.
        </p>
        <p className="text-white/45">
          Surface maps use public-domain NASA mission imagery (Blue Marble, Black
          Marble, LRO, MRO, MESSENGER, Juno, Cassini, Voyager, New Horizons, SDO)
          and CC-BY science maps where noted. Orbital mechanics remain simplified
          for real-time visualization.
        </p>
        <div className="text-white/45 text-[11px] pt-2 border-t border-white/5 space-y-2">
          <p className="text-white/70 tracking-[0.15em] uppercase text-[10px]">
            Music credits
          </p>
          <p>
            Original ambient score is synthesized in the app. The 80s Retro
            playlist uses openly licensed tracks (no commercial recordings):
          </p>
          <ul className="space-y-1.5 list-disc pl-4">
            {RETRO_TRACKS.map((track) => (
              <li key={track.id}>
                <a
                  href={track.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-white/80 underline decoration-white/20 hover:decoration-white/60"
                >
                  {track.title}
                </a>
                {' '}
                by {track.artist} —{' '}
                <a
                  href={track.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-white/20 hover:decoration-white/60"
                >
                  {track.license}
                </a>
              </li>
            ))}
          </ul>
          <p>
            Kevin MacLeod tracks: Title Kevin MacLeod (incompetech.com) Licensed
            under Creative Commons: By Attribution 4.0 —
            https://creativecommons.org/licenses/by/4.0/
          </p>
        </div>
        <p className="text-white/35 text-[11px] pt-2 border-t border-white/5">
          Built with React, Three.js, React Three Fiber, Tailwind CSS & Framer
          Motion.
        </p>
      </div>
    </PanelShell>
  )
}

function CameraTipsPanel() {
  const setActivePanel = useSimulatorStore((s) => s.setActivePanel)
  return (
    <PanelShell title="Camera Controls" onClose={() => setActivePanel(null)}>
      <ul className="space-y-2.5 text-[12px]">
        <li>
          <strong className="text-white/90">Orbit</strong> — Left mouse drag
        </li>
        <li>
          <strong className="text-white/90">Zoom</strong> — Scroll wheel or Zoom
          In / Out buttons
        </li>
        <li>
          <strong className="text-white/90">Pan</strong> — Right mouse drag
        </li>
        <li>
          <strong className="text-white/90">Top View</strong> — Overhead solar
          system overview
        </li>
        <li>
          <strong className="text-white/90">Free Orbit</strong> — Return to the
          default cinematic vantage
        </li>
        <li>
          <strong className="text-white/90">Focus</strong> — Click any body for a
          smooth approach
        </li>
      </ul>
    </PanelShell>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-[12px] text-white/90">{label}</p>
        <p className="text-[11px] text-white/40">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
          checked ? 'bg-space-accent/40' : 'bg-white/10'
        }`}
        onClick={() => onChange(!checked)}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  )
}

export function FloatingPanels() {
  const activePanel = useSimulatorStore((s) => s.activePanel)
  const photoMode = useSimulatorStore((s) => s.photoMode)

  if (photoMode) return null

  return (
    <AnimatePresence mode="wait">
      {activePanel === 'settings' && <SettingsPanel key="settings" />}
      {activePanel === 'music' && <MusicPanel key="music" />}
      {activePanel === 'help' && <HelpPanel key="help" />}
      {activePanel === 'about' && <AboutPanel key="about" />}
      {activePanel === 'camera' && <CameraTipsPanel key="camera" />}
    </AnimatePresence>
  )
}
