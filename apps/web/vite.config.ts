import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * `base` diffère entre développement et production.
 *
 * GitHub Pages sert un dépôt de projet depuis un sous-chemin —
 * `/scales/` — et les liens vers les fichiers construits doivent en tenir
 * compte. En développement, le serveur est à la racine : imposer le même
 * préfixe obligerait à taper l'URL du dépôt pour travailler en local.
 */
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/scales/' : '/',
  plugins: [react()],
  optimizeDeps: {
    // Les paquets internes exposent leur source TypeScript : Vite doit la
    // compiler comme du code du projet, pas la pré-empaqueter comme une
    // dépendance publiée.
    exclude: ['@scales/music-theory', '@scales/audio', '@scales/ui'],
  },
}))
