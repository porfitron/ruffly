import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const base = '/'
const appPath = '/web/'

/** GitHub Pages serves 404.html for unknown paths — copy SPA shell so client routes work. */
function spaFallback() {
  return {
    name: 'spa-github-pages-fallback',
    closeBundle() {
      const dist = resolve(rootDir, 'dist')
      copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    spaFallback(),
    VitePWA({
      registerType: 'autoUpdate',
      // Limit SW control to the web app so marketing pages stay uncached by the shell
      scope: appPath,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ruffly',
        short_name: 'Ruffly',
        description:
          'Precision dog nutrition — calories, portions, pantry, and care sheets.',
        theme_color: '#F59E0B',
        background_color: '#FBF9F5',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: appPath,
        scope: appPath,
        categories: ['lifestyle', 'utilities'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackAllowlist: [/^\/web/],
        // Avoid workbox → terser crashes in some CI/sandbox environments
        mode: 'development',
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
})
