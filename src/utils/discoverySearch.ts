import { PLANETS } from '../data/planets'
import { COMETS } from '../data/comets'
import { MISSIONS, type DiscoveryEntry } from '../data/missions'

export type SearchHit = {
  id: string
  name: string
  kind: string
  travelTargetId: string
  subtitle: string
}

/** Unified searchable catalog: bodies + missions + comets */
export function buildSearchIndex(): SearchHit[] {
  const hits: SearchHit[] = []

  for (const p of PLANETS) {
    hits.push({
      id: p.id,
      name: p.name,
      kind: p.isMoon ? 'moon' : p.id === 'sun' ? 'star' : 'planet',
      travelTargetId: p.id,
      subtitle: p.isMoon ? `Moon of ${p.parentId}` : p.info.distanceFromSun,
    })
  }

  for (const c of COMETS) {
    hits.push({
      id: c.id,
      name: c.name,
      kind: 'comet',
      travelTargetId: c.id === 'halley' ? 'jupiter' : c.id === 'neowise' ? 'mars' : 'saturn',
      subtitle: 'Comet',
    })
  }

  for (const m of MISSIONS) {
    hits.push({
      id: m.id,
      name: m.name,
      kind: m.kind,
      travelTargetId: m.travelTargetId ?? m.id,
      subtitle: m.mission ?? m.status ?? 'Mission',
    })
  }

  return hits
}

export function filterSearch(query: string, index: SearchHit[]): SearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return index.slice(0, 24)
  return index
    .filter((h) => {
      if (h.name.toLowerCase().includes(q)) return true
      if (h.id.toLowerCase().includes(q)) return true
      if (h.kind.toLowerCase().includes(q)) return true
      if (h.subtitle.toLowerCase().includes(q)) return true
      const mission = MISSIONS.find((m) => m.id === h.id)
      if (mission?.searchTerms.some((t) => t.includes(q))) return true
      return false
    })
    .slice(0, 40)
}

export function getDiscoveryForId(id: string): DiscoveryEntry | null {
  return MISSIONS.find((m) => m.id === id) ?? null
}
