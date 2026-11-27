import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// Production builds are served from GitHub Pages at /space-trader-pwa/. Dev and
// preview use the same path so URLs behave identically everywhere.
// If the app moves to its own domain, change this to '/'.
const BASE = '/space-trader-pwa/';

const BACKGROUND = '#0b0e1a';

export default defineConfig({
  base: BASE,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-32.png', 'icons/apple-touch-icon-180.png'],
      manifest: {
        name: 'Space Trader',
        short_name: 'Space Trader',
        description: 'Trade goods, upgrade your ship and battle pirates across the galaxy.',
        theme_color: BACKGROUND,
        background_color: BACKGROUND,
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache everything, including all game images, so the game works offline.
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
