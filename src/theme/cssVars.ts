/**
 * Genera le CSS variables (`--mst-*`) a partire dalla palette TypeScript.
 *
 * Usato:
 *  - da vite.config.ts (plugin) per iniettare uno <style id="mst-theme-vars">
 *    direttamente in index.html → le variabili esistono prima del primo paint;
 *  - a runtime da ThemeProvider (riscrive lo stesso <style>, utile in HMR).
 *
 * I nomi `--mst-gray-*` / `--mst-red-*` contengono i canali "R G B" e sono
 * referenziati da tailwind.config.js come `rgb(var(--mst-gray-500) / <alpha-value>)`.
 * File PURO: nessuna API del browser.
 */
import { palettes, type Palette, type ThemeName } from './palette';

const toChannels = (hex: string): string => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full.slice(0, 6), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

const SCALAR_KEYS: (keyof Palette)[] = [
  'themeColor',
  'primary',
  'onPrimary',
  'link',
  'focusRing',
  'success',
  'warning',
  'error',
  'bgFrom',
  'bgTo',
  'bgBase',
  'container',
  'containerOpaque',
  'surface',
  'elevated',
  'sunken',
  'border',
  'borderSubtle',
  'borderStrong',
  'text',
  'textSecondary',
  'textTertiary',
  'selectedBg',
  'selectedText',
  'hoverBg',
  'glassBg',
  'glassBgStrong',
  'glassOpaque',
  'glassBorder',
  'glassHighlight',
  'glassShadow',
  'glassLuminosity',
  'statusBarTint',
  'scrollEdge',
  'shadowSm',
  'shadowLg',
];

export const paletteToCssDeclarations = (p: Palette): string => {
  const decls: string[] = [];
  for (const key of SCALAR_KEYS) {
    decls.push(`--mst-${kebab(key)}:${p[key]}`);
  }
  for (const [step, hex] of Object.entries(p.gray)) {
    decls.push(`--mst-gray-${step}:${toChannels(hex)}`);
  }
  for (const [step, hex] of Object.entries(p.red)) {
    decls.push(`--mst-red-${step}:${toChannels(hex)}`);
  }
  return decls.join(';');
};

/** CSS completo per entrambi i temi (selettori :root[data-theme=...]). */
export const buildThemeCss = (): string => {
  const block = (name: ThemeName) =>
    `${paletteToCssDeclarations(palettes[name])};color-scheme:${name}`;
  return [
    `:root,:root[data-theme="light"]{${block('light')}}`,
    `:root[data-theme="dark"]{${block('dark')}}`,
    // fallback se lo script inline non ha potuto impostare data-theme
    `@media (prefers-color-scheme: dark){:root:not([data-theme]){${block('dark')}}}`,
  ].join('\n');
};
