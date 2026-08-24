/** Famous comets — visual scale for Living Solar System */

export interface CometData {
  id: string
  name: string
  /** Perihelion distance scene units */
  perihelion: number
  /** Aphelion scene units */
  aphelion: number
  /** Period in Earth years */
  periodYears: number
  inclination: number
  /** Argument of perihelion (rad phase) */
  phase: number
  color: string
  tailLength: number
}

export const COMETS: CometData[] = [
  {
    id: 'halley',
    name: "Halley's Comet",
    perihelion: 8.5,
    aphelion: 95,
    periodYears: 75.3,
    inclination: 162,
    phase: 0.4,
    color: '#c8d8ff',
    tailLength: 12,
  },
  {
    id: 'hale-bopp',
    name: 'Hale–Bopp',
    perihelion: 10,
    aphelion: 110,
    periodYears: 2533,
    inclination: 89.4,
    phase: 1.8,
    color: '#e0e8ff',
    tailLength: 18,
  },
  {
    id: 'neowise',
    name: 'NEOWISE',
    perihelion: 7.5,
    aphelion: 85,
    periodYears: 6800,
    inclination: 128.9,
    phase: 3.2,
    color: '#ffe8c0',
    tailLength: 14,
  },
]
