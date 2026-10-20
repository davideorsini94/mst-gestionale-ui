/**
 * Palette unica dell'applicazione (derivata dal logo del club).
 *
 * - navy  #1F3A72 → primario in tema chiaro
 * - azzurro #8FB8E8 → primario in tema scuro (testo navy sopra per contrasto AA)
 * - ghiaccio → sfondi (sfumatura)
 * - rosso Milano #C8202F → solo azioni distruttive / errori (più chiaro in scuro)
 *
 * Questo file è PURO (nessuna API del browser): viene importato anche da
 * vite.config.ts per iniettare le CSS variables in index.html (niente flash
 * del tema) e da tailwind (tramite i nomi delle variabili, vedi cssVars.ts).
 */

export type ThemeName = 'light' | 'dark';

/** Scala neutra (Tailwind gray-*) — valori esadecimali. */
export type GrayScale = Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900' | '950', string>;
export type RedScale = Record<'50' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900', string>;

export interface Palette {
  /** colore usato per <meta name="theme-color"> */
  themeColor: string;

  primary: string;
  /** testo sopra il colore primario (AntD colorTextLightSolid) */
  onPrimary: string;
  link: string;
  focusRing: string;

  success: string;
  warning: string;
  error: string;

  /** sfondo pagina (sfumatura ghiaccio) */
  bgFrom: string;
  bgTo: string;
  /** colore pieno di base (html, overscroll, seed AntD) */
  bgBase: string;

  /** contenitore principale dei contenuti (materiale "standard", NON vetro) */
  container: string;
  containerOpaque: string;
  /** card / tabelle (AntD colorBgContainer) */
  surface: string;
  /** modali, select, popup solidi (AntD colorBgElevated) */
  elevated: string;
  /** intestazioni tabella, aree incassate */
  sunken: string;

  border: string;
  borderSubtle: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  /** voce di menu selezionata */
  selectedBg: string;
  selectedText: string;
  hoverBg: string;

  /** Materiale vetro (solo navigazione / controlli flottanti) */
  glassBg: string;
  glassBgStrong: string;
  glassOpaque: string;
  glassBorder: string;
  glassHighlight: string;
  glassShadow: string;
  /** luminosità applicata al backdrop (variante "regular") */
  glassLuminosity: string;

  /** tinta dietro la status bar iOS (testo bianco: black-translucent) */
  statusBarTint: string;
  /** colore della sfumatura scroll-edge sotto la barra superiore */
  scrollEdge: string;

  shadowSm: string;
  shadowLg: string;

  gray: GrayScale;
  red: RedScale;
}

const NAVY = '#1F3A72';
const SKY = '#8FB8E8';
const MILAN_RED = '#C8202F';

export const palettes: Record<ThemeName, Palette> = {
  light: {
    themeColor: '#EAF1FA',

    primary: NAVY,
    onPrimary: '#FFFFFF',
    link: '#24488C',
    focusRing: '#2F62C2',

    success: '#2E8B57',
    warning: '#C27C0E',
    error: MILAN_RED,

    bgFrom: '#EAF1FA',
    bgTo: '#F6F9FD',
    bgBase: '#EEF4FB',

    container: 'rgba(255, 255, 255, 0.72)',
    containerOpaque: '#FAFCFE',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
    sunken: '#F1F5FB',

    border: '#D3DDEA',
    borderSubtle: '#E3EAF4',
    borderStrong: '#5B6B86',

    text: '#0F1E3A',
    textSecondary: '#3F4D66',
    textTertiary: '#5F6C84',

    selectedBg: 'rgba(31, 58, 114, 0.10)',
    selectedText: NAVY,
    hoverBg: 'rgba(31, 58, 114, 0.06)',

    glassBg: 'rgba(246, 249, 253, 0.62)',
    glassBgStrong: 'rgba(246, 249, 253, 0.82)',
    glassOpaque: '#F3F7FC',
    glassBorder: 'rgba(255, 255, 255, 0.70)',
    glassHighlight: 'rgba(255, 255, 255, 0.85)',
    glassShadow: '0 8px 32px rgba(31, 58, 114, 0.12), 0 1px 2px rgba(31, 58, 114, 0.08)',
    glassLuminosity: '1.04',

    statusBarTint: 'rgba(15, 30, 58, 0.92)',
    scrollEdge: 'rgba(234, 241, 250, 0.88)',

    shadowSm: '0 1px 2px rgba(15, 30, 58, 0.06), 0 2px 8px rgba(31, 58, 114, 0.06)',
    shadowLg: '0 12px 40px rgba(31, 58, 114, 0.16), 0 2px 6px rgba(31, 58, 114, 0.08)',

    gray: {
      '50': '#F6F8FB',
      '100': '#EEF2F7',
      '200': '#E2E8F0',
      '300': '#CBD5E1',
      '400': '#8C9AB0',
      '500': '#5F6C84',
      '600': '#46536B',
      '700': '#334155',
      '800': '#1E293B',
      '900': '#0F1E3A',
      '950': '#07101F',
    },
    red: {
      '50': '#FDF2F3',
      '100': '#FBE3E5',
      '200': '#F5C2C7',
      '300': '#EC939B',
      '400': '#DE5763',
      '500': MILAN_RED,
      '600': '#AD1B28',
      '700': '#911621',
      '800': '#78131C',
      '900': '#5F0F16',
    },
  },

  dark: {
    themeColor: '#0B1426',

    primary: SKY,
    onPrimary: '#0B1426',
    link: '#A9CAF0',
    focusRing: '#A9CAF0',

    success: '#5CC48A',
    warning: '#E9B44C',
    error: '#FF6B75',

    bgFrom: '#0B1426',
    bgTo: '#111D33',
    bgBase: '#0E182D',

    container: 'rgba(19, 32, 57, 0.72)',
    containerOpaque: '#122039',
    surface: '#15233F',
    elevated: '#1A2A4A',
    sunken: '#1B2B4A',

    border: '#2B3D5F',
    borderSubtle: '#22324F',
    borderStrong: '#9FB0CC',

    text: '#E6EDF7',
    textSecondary: '#B7C3D7',
    textTertiary: '#93A1B9',

    selectedBg: 'rgba(143, 184, 232, 0.18)',
    selectedText: '#CFE2F8',
    hoverBg: 'rgba(143, 184, 232, 0.10)',

    glassBg: 'rgba(17, 29, 51, 0.58)',
    glassBgStrong: 'rgba(17, 29, 51, 0.80)',
    glassOpaque: '#142240',
    glassBorder: 'rgba(143, 184, 232, 0.18)',
    glassHighlight: 'rgba(255, 255, 255, 0.08)',
    glassShadow: '0 8px 32px rgba(0, 0, 0, 0.45), 0 1px 2px rgba(0, 0, 0, 0.30)',
    glassLuminosity: '0.92',

    statusBarTint: 'rgba(7, 13, 26, 0.94)',
    scrollEdge: 'rgba(11, 20, 38, 0.88)',

    shadowSm: '0 1px 2px rgba(0, 0, 0, 0.30), 0 2px 8px rgba(0, 0, 0, 0.20)',
    shadowLg: '0 12px 40px rgba(0, 0, 0, 0.55), 0 2px 6px rgba(0, 0, 0, 0.30)',

    // scala invertita: gray-50 è la più scura, gray-900 la più chiara
    gray: {
      '50': '#0F1A2E',
      '100': '#15223B',
      '200': '#1E2D4A',
      '300': '#2C3D5E',
      '400': '#7A8AA6',
      '500': '#93A1B9',
      '600': '#ABB7CB',
      '700': '#C3CCDB',
      '800': '#DCE3EE',
      '900': '#EEF2F8',
      '950': '#F7F9FC',
    },
    red: {
      '50': '#2A1218',
      '100': '#3A1A22',
      '200': '#5C2430',
      '300': '#8C3341',
      '400': '#E0525E',
      '500': '#FF6B75',
      '600': '#FF858D',
      '700': '#FFA3A9',
      '800': '#FFC2C6',
      '900': '#FFE0E2',
    },
  },
};
