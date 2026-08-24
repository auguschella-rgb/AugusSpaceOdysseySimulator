/**
 * Mission Alpha 6.0 — spacecraft, probes, and discovery catalog.
 * Scientific facts from public NASA mission data (summarized).
 */

export type DiscoveryKind = 'planet' | 'moon' | 'comet' | 'mission' | 'spacecraft'

export interface DiscoveryEntry {
  id: string
  name: string
  kind: DiscoveryKind
  /** Link to scene body for travel (planet/moon id) or self for missions */
  travelTargetId?: string
  /** Parent body for satellites in scene */
  parentBodyId?: string
  /** Visual orbit radius around parent (scene units) */
  localOrbit?: number
  color: string
  mission?: string
  launchDate?: string
  status?: string
  currentTarget?: string
  mass?: string
  diameter?: string
  temperature?: string
  gravity?: string
  discovery?: string
  history?: string
  facts: string[]
  searchTerms: string[]
}

export const MISSIONS: DiscoveryEntry[] = [
  {
    id: 'iss',
    name: 'International Space Station',
    kind: 'spacecraft',
    travelTargetId: 'earth',
    parentBodyId: 'earth',
    localOrbit: 1.85,
    color: '#c0c8d8',
    mission: 'ISS — Continuous human presence in LEO',
    launchDate: '1998-11-20 (Zarya)',
    status: 'Operational',
    currentTarget: 'Low Earth Orbit',
    mass: '~420,000 kg',
    diameter: '109 m (truss length)',
    temperature: '−157 to 121 °C (external)',
    gravity: 'Microgravity environment',
    discovery: 'International partnership (NASA, Roscosmos, ESA, JAXA, CSA)',
    history: 'Assembly began 1998; continuous crewed operations since 2000.',
    facts: [
      'Orbits Earth roughly every 90 minutes.',
      'Largest human-made object in orbit.',
      'Hosts science across biology, physics, and Earth observation.',
    ],
    searchTerms: ['iss', 'space station', 'station', 'leo'],
  },
  {
    id: 'hubble',
    name: 'Hubble Space Telescope',
    kind: 'spacecraft',
    travelTargetId: 'earth',
    parentBodyId: 'earth',
    localOrbit: 2.1,
    color: '#a8b4c8',
    mission: 'HST — Deep-space optical astronomy',
    launchDate: '1990-04-24',
    status: 'Operational',
    currentTarget: 'Deep space surveys',
    mass: '11,110 kg',
    diameter: '13.2 m length',
    temperature: 'Controlled internal',
    gravity: 'LEO microgravity',
    discovery: 'NASA / ESA',
    history: 'Launched by STS-31; multiple servicing missions extended life.',
    facts: [
      'Has transformed extragalactic astronomy.',
      'Observes UV, visible, and near-infrared light.',
    ],
    searchTerms: ['hubble', 'hst', 'telescope'],
  },
  {
    id: 'jwst',
    name: 'James Webb Space Telescope',
    kind: 'spacecraft',
    travelTargetId: 'earth',
    parentBodyId: 'earth',
    localOrbit: 4.2,
    color: '#d4c8a8',
    mission: 'JWST — Infrared observatory at L2',
    launchDate: '2021-12-25',
    status: 'Operational',
    currentTarget: 'Sun–Earth L2',
    mass: '6,200 kg',
    diameter: '6.5 m primary mirror',
    temperature: '~40 K (instruments)',
    gravity: 'Halo orbit near L2',
    discovery: 'NASA / ESA / CSA',
    history: 'Successor to Hubble for infrared deep-field science.',
    facts: [
      'Largest space telescope ever launched.',
      'Gold-coated beryllium mirror segments.',
    ],
    searchTerms: ['jwst', 'webb', 'james webb', 'l2'],
  },
  {
    id: 'voyager1',
    name: 'Voyager 1',
    kind: 'spacecraft',
    // No invented heliocentric marker — trajectory visualization pending
    color: '#b0a898',
    mission: 'Voyager 1 — Outer planets & interstellar space',
    launchDate: '1977-09-05',
    status: 'Active (interstellar)',
    currentTarget: 'Interstellar medium',
    mass: '825.5 kg',
    diameter: 'Bus ~few meters',
    temperature: 'RTG-powered thermal control',
    gravity: 'Heliocentric / interstellar trajectory',
    discovery: 'NASA JPL',
    history: 'Jupiter & Saturn flybys; crossed heliopause 2012.',
    facts: [
      'Farthest human-made object from Earth.',
      'Carries the Golden Record.',
      'Mission information available — trajectory visualization pending.',
    ],
    searchTerms: ['voyager', 'voyager 1', 'voyager1', 'interstellar'],
  },
  {
    id: 'voyager2',
    name: 'Voyager 2',
    kind: 'spacecraft',
    // No invented heliocentric marker — trajectory visualization pending
    color: '#a8a090',
    mission: 'Voyager 2 — Grand Tour of outer planets',
    launchDate: '1977-08-20',
    status: 'Active (interstellar)',
    currentTarget: 'Interstellar medium',
    mass: '825.5 kg',
    diameter: 'Bus ~few meters',
    temperature: 'RTG-powered',
    gravity: 'Heliocentric trajectory',
    discovery: 'NASA JPL',
    history: 'Only spacecraft to visit Uranus and Neptune.',
    facts: [
      'Completed the planetary grand tour.',
      'Still returns heliophysics data.',
      'Mission information available — trajectory visualization pending.',
    ],
    searchTerms: ['voyager 2', 'voyager2'],
  },
  {
    id: 'curiosity',
    name: 'Curiosity',
    kind: 'mission',
    travelTargetId: 'mars',
    parentBodyId: 'mars',
    localOrbit: 0.55,
    color: '#c07040',
    mission: 'MSL Curiosity — Gale Crater rover',
    launchDate: '2011-11-26',
    status: 'Active on Mars',
    currentTarget: 'Gale Crater / Mount Sharp',
    mass: '899 kg',
    diameter: '2.9 m length',
    temperature: 'Martian surface extremes',
    gravity: '0.38 g (Mars)',
    discovery: 'NASA JPL',
    history: 'Landed August 2012 via sky crane.',
    facts: [
      'Nuclear-powered (MMRTG).',
      'Found evidence of ancient habitable environments.',
    ],
    searchTerms: ['curiosity', 'msl', 'rover mars'],
  },
  {
    id: 'perseverance',
    name: 'Perseverance',
    kind: 'mission',
    travelTargetId: 'mars',
    parentBodyId: 'mars',
    localOrbit: 0.62,
    color: '#d08050',
    mission: 'Mars 2020 Perseverance — Jezero Crater',
    launchDate: '2020-07-30',
    status: 'Active on Mars',
    currentTarget: 'Jezero Crater',
    mass: '1,025 kg',
    diameter: '3 m length',
    temperature: 'Martian surface',
    gravity: '0.38 g (Mars)',
    discovery: 'NASA JPL',
    history: 'Landed February 2021; carries Ingenuity helicopter.',
    facts: [
      'Caching samples for future return.',
      'MOXIE demonstrated oxygen production from CO₂.',
    ],
    searchTerms: ['perseverance', 'mars 2020', 'jezero'],
  },
  {
    id: 'juno',
    name: 'Juno',
    kind: 'spacecraft',
    travelTargetId: 'jupiter',
    parentBodyId: 'jupiter',
    localOrbit: 3.2,
    color: '#c9a070',
    mission: 'Juno — Jupiter polar orbiter',
    launchDate: '2011-08-05',
    status: 'Operational',
    currentTarget: 'Jupiter',
    mass: '3,625 kg',
    diameter: 'Solar arrays span ~20 m',
    temperature: 'Jovian environment',
    gravity: 'Jupiter system',
    discovery: 'NASA / SwRI / JPL',
    history: 'Arrived 2016; mapped gravity, magnetic field, and atmosphere.',
    facts: [
      'First solar-powered Jupiter orbiter.',
      'Revealed deep atmospheric dynamics.',
    ],
    searchTerms: ['juno', 'jupiter mission'],
  },
  {
    id: 'cassini',
    name: 'Cassini',
    kind: 'spacecraft',
    travelTargetId: 'saturn',
    parentBodyId: 'saturn',
    localOrbit: 4.5,
    color: '#e0c992',
    mission: 'Cassini–Huygens — Saturn system',
    launchDate: '1997-10-15',
    status: 'Mission ended 2017',
    currentTarget: '— (Grand Finale complete)',
    mass: '5,712 kg (dry)',
    diameter: 'Orbiter bus ~several meters',
    temperature: 'Saturn system',
    gravity: 'Saturn system',
    discovery: 'NASA / ESA / ASI',
    history: 'Orbited Saturn 2004–2017; Huygens landed on Titan.',
    facts: [
      'Revealed Enceladus water plumes.',
      'Ended with intentional atmospheric plunge.',
    ],
    searchTerms: ['cassini', 'huygens', 'saturn mission'],
  },
  {
    id: 'newhorizons',
    name: 'New Horizons',
    kind: 'spacecraft',
    // Region focus only via search → Pluto; no fake trajectory path
    travelTargetId: 'pluto',
    color: '#c4a88a',
    mission: 'New Horizons — Pluto & Kuiper Belt',
    launchDate: '2006-01-19',
    status: 'Active (Kuiper Belt)',
    currentTarget: 'Kuiper Belt',
    mass: '478 kg',
    diameter: 'Piano-sized spacecraft',
    temperature: 'Deep space',
    gravity: 'Heliocentric',
    discovery: 'NASA / APL / SwRI',
    history: 'Pluto flyby July 2015; Arrokoth 2019.',
    facts: [
      'First detailed images of Pluto.',
      'Fastest spacecraft at launch (for its time).',
      'Mission information available — trajectory visualization pending.',
    ],
    searchTerms: ['new horizons', 'newhorizons', 'pluto mission'],
  },
]

export const MISSIONS_BY_ID = Object.fromEntries(MISSIONS.map((m) => [m.id, m])) as Record<
  string,
  DiscoveryEntry
>

export type WarpLevel = 0 | 1 | 5 | 10 | 100

export const WARP_SPEEDS: Record<WarpLevel, number> = {
  0: 0,
  1: 8,
  5: 35,
  10: 90,
  100: 220, // lightspeed cinematic
}

export type CameraModeId =
  | 'explorer'
  | 'pilot'
  | 'orbit'
  | 'imax'
  | 'documentary'
  | 'drone'

export const CAMERA_MODES: { id: CameraModeId; label: string; description: string }[] = [
  { id: 'explorer', label: 'Explorer', description: 'Default free exploration' },
  { id: 'pilot', label: 'Pilot', description: 'Spacecraft cockpit feel' },
  { id: 'orbit', label: 'Orbit', description: 'Stable orbital survey' },
  { id: 'imax', label: 'IMAX', description: 'Wide cinematic framing' },
  { id: 'documentary', label: 'Documentary', description: 'Slow observational' },
  { id: 'drone', label: 'Drone', description: 'Agile close inspection' },
]
