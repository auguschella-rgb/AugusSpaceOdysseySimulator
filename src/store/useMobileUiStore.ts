import { create } from 'zustand'

export type MobileTab = 'explore' | 'camera' | 'planets'
export type MobileCardMode = 'none' | 'compact' | 'expanded'

/** Mobile-only UI state: controls bottom sheet + info card coordination. */
interface MobileUiStore {
  sheetOpen: boolean
  tab: MobileTab
  cardMode: MobileCardMode
  /** Hide all overlay chrome; canvas + a tiny minimize control only. Kept across rotation. */
  immersive: boolean
  /** One-time iOS Home Screen tip is visible in the current immersive session. */
  showHomeScreenTip: boolean
  setSheetOpen: (v: boolean) => void
  setTab: (t: MobileTab) => void
  setCardMode: (m: MobileCardMode) => void
  setImmersive: (v: boolean) => void
  setShowHomeScreenTip: (v: boolean) => void
}

export const useMobileUiStore = create<MobileUiStore>((set) => ({
  sheetOpen: false,
  tab: 'explore',
  cardMode: 'none',
  immersive: false,
  showHomeScreenTip: false,
  setSheetOpen: (v) => set({ sheetOpen: v }),
  setTab: (t) => set({ tab: t }),
  setCardMode: (m) => set({ cardMode: m }),
  setImmersive: (v) => set({ immersive: v }),
  setShowHomeScreenTip: (v) => set({ showHomeScreenTip: v }),
}))
