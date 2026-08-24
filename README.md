# Augus Space Odyssey Simulator

**Journey Beyond Reality**

Premium cinematic Solar System Explorer — Version 1 (Mission Alpha).

## Features

- Immersive landing sequence with rising sun and star field
- Full solar system: Sun, Mercury → Pluto, Earth, Moon
- Smooth orbits, planetary rotation, Saturn rings, Earth clouds
- Free orbit camera: rotate, zoom, pan + cinematic fly-to
- Scientific planet dossiers with real astronomical data
- Timeline year control (1990–2100)
- Simulation speed, pause, play, reset
- Photo mode (UI-free screenshots)
- Original Web Audio ambient soundtrack (no copyrighted music)
- NASA / Interstellar–inspired glass UI

## Tech Stack

- React + TypeScript
- React Three Fiber (Three.js)
- Tailwind CSS
- Framer Motion
- Zustand

## Run

```bash
npm install
npm run dev
```

Open the local URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Controls

| Input | Action |
|--------|--------|
| Left drag | Orbit camera |
| Scroll | Zoom |
| Right drag | Pan |
| Click planet | Fly to + open info |
| Space | Pause / Play |
| P | Photo mode |
| Esc | Close panels / exit photo mode |

## Project structure

```
src/
  audio/           Ambient Web Audio engine
  components/
    landing/       Landing page
    scene/         R3F solar system
    ui/            Mission control HUD
  data/            Planet scientific data
  store/           Global simulator state
  utils/           Orbital math
```
