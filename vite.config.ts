import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
  plugins: [react(), mstThemeVars()],
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
    minify: false,
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
