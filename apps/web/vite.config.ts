import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // Les paquets internes exposent leur source TypeScript : Vite doit la
    // compiler comme du code du projet, pas la pré-empaqueter comme une
    // dépendance publiée.
    exclude: ['@scales/music-theory', '@scales/audio', '@scales/ui'],
  },
})
