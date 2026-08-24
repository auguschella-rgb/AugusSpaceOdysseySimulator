import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GITHUB_PAGES=true when building for GitHub Pages project site
const base = process.env.GITHUB_PAGES === 'true' ? '/AugusSpaceOdysseySimulator/' : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
