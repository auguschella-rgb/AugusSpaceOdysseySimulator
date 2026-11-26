import { create } from 'zustand'

export type MobileTab = 'explore' | 'camera' | 'planets'
export type MobileCardMode = 'none' | 'compact' | 'expanded'

/** Mobile-only UI state: controls bottom sheet + info card coordination. */
interface MobileUiStore {
  sheetOpen: boolean
  tab: MobileTab
  cardMode: MobileCardMode
  setSheetOpen: (v: boolean) => void
  setTab: (t: MobileTab) => void
  setCardMode: (m: MobileCardMode) => void
}

export const useMobileUiStore = create<MobileUiStore>((set) => ({
  sheetOpen: false,
  tab: 'explore',
  cardMode: 'none',
  setSheetOpen: (v) => set({ sheetOpen: v }),
  setTab: (t) => set({ tab: t }),
  setCardMode: (m) => set({ cardMode: m }),
}))
