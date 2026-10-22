import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildThemeCss } from './src/theme/cssVars';

/**
 * Inietta in index.html le CSS variables del tema generate dalla palette
 * TypeScript (src/theme/palette.ts): disponibili prima del primo paint,
 * così lo script inline anti-flash e lo sfondo funzionano senza attendere il bundle.
 */
const mstThemeVars = (): Plugin => ({
  name: 'mst-theme-vars',
  transformIndexHtml(html) {
    return html.replace(
      '<!--mst-theme-vars-->',
      `<style id="mst-theme-vars">${buildThemeCss()}</style>`
    );
  },
});

/**
 * Id di build nel service worker: sostituisce __BUILD_ID__ nel sw.js copiato da public/ in dist. Ogni build produce
 * un sw.js diverso, quindi il browser installa il nuovo service worker (nuovo CACHE_NAME, vecchie cache eliminate) e
 * compare l'avviso "Nuova versione disponibile" a ogni deploy, senza cambiare il nome della cache a mano.
 */
const swBuildId = (): Plugin => {
  let outDir = 'dist';
  return {
    name: 'mst-sw-build-id',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const swPath = resolve(outDir, 'sw.js');
      const source = readFileSync(swPath, 'utf8');
      if (!source.includes('__BUILD_ID__')) {
        throw new Error('sw.js: segnaposto __BUILD_ID__ non trovato');
      }
      const buildId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + Math.random().toString(36).slice(2, 8);
      writeFileSync(swPath, source.split('__BUILD_ID__').join(buildId));
    },
  };
};

export default defineConfig({
  plugins: [react(), mstThemeVars(), swBuildId()],
  resolve: {
    alias: [
      { find: '@src', replacement: '/src' },
      { find: '@components', replacement: '/src/components' },
      { find: '@pages', replacement: '/src/pages' },
      { find: '@services', replacement: '/src/services' },
      { find: '@atoms', replacement: '/src/atoms' },
      { find: '@models', replacement: '/src/models' },
      { find: '@helpers', replacement: '/src/helpers' },
    ],
  },
  build: {
    modulePreload: true,
    target: ['es2020', 'safari15'],
    minify: 'esbuild',
    cssCodeSplit: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://mst-gestionale-be:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
});
