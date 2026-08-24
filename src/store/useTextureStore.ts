import { create } from 'zustand'

interface TextureStore {
  nasaReady: boolean
  setNasaReady: (v: boolean) => void
  revision: number
  bump: () => void
}

export const useTextureStore = create<TextureStore>((set) => ({
  nasaReady: false,
  setNasaReady: (v) => set({ nasaReady: v }),
  revision: 0,
  bump: () => set((s) => ({ revision: s.revision + 1, nasaReady: true })),
}))
