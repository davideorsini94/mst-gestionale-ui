import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
    target: 'esnext',
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
