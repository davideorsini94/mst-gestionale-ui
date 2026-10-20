/** @type {import('tailwindcss').Config} */

/*
 * I colori seguono il tema (chiaro/scuro) tramite le CSS variables --mst-*
 * generate da src/theme/palette.ts (vedi src/theme/cssVars.ts).
 * gray-* e red-* sono canali "R G B" → supportano anche i modificatori di opacità
 * (es. bg-gray-100/50). Le classi esistenti (text-gray-600, bg-gray-100,
 * border-gray-200, text-red-500, …) cambiano quindi automaticamente col tema.
 */
const channels = (name) => `rgb(var(--mst-${name}) / <alpha-value>)`;
const scale = (name, steps) =>
  Object.fromEntries(steps.map((step) => [step, channels(`${name}-${step}`)]));

const GRAY_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const RED_STEPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: scale('gray', GRAY_STEPS),
        red: scale('red', RED_STEPS),

        // token semantici
        primary: 'var(--mst-primary)',
        'on-primary': 'var(--mst-on-primary)',
        surface: 'var(--mst-surface)',
        'surface-elevated': 'var(--mst-elevated)',
        'surface-sunken': 'var(--mst-sunken)',
        fg: 'var(--mst-text)',
        'fg-secondary': 'var(--mst-text-secondary)',
        'fg-tertiary': 'var(--mst-text-tertiary)',
        success: 'var(--mst-success)',
        warn: 'var(--mst-warning)',
        danger: 'var(--mst-error)',
      },
      borderColor: {
        DEFAULT: 'var(--mst-border)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false
  }
}
