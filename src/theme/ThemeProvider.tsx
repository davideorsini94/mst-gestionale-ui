import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { palettes, type ThemeName } from './palette';
import { buildThemeCss } from './cssVars';
import {
  hasPreferences,
  normalizePreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type StoredPreferences,
  type ThemeMode,
  type UserPreferences,
} from './preferences';
import { apiService } from '../services/ApiService';
import { authService, type User } from '../services/AuthService';
import { message } from '../services/notify';

interface ThemeContextValue {
  /** scelta dell'utente */
  mode: ThemeMode;
  /** tema effettivo applicato */
  resolved: ThemeName;
  reduceTransparency: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  setMode: (mode: ThemeMode) => void;
  setReduceTransparency: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const safeMatchMedia = (query: string): MediaQueryList | null => {
  try {
    return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query) : null;
  } catch {
    return null;
  }
};

/** Hook per una media query con listener (compatibile con Safari < 14). */
const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => safeMatchMedia(query)?.matches ?? false);
  useEffect(() => {
    const mql = safeMatchMedia(query);
    if (!mql) return;
    const onChange = () => setMatches(mql.matches);
    onChange();
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);
  return matches;
};

const ensureThemeStyle = () => {
  try {
    let el = document.getElementById('mst-theme-vars') as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = 'mst-theme-vars';
      document.head.prepend(el);
    }
    const css = buildThemeCss();
    if (el.textContent !== css) el.textContent = css;
  } catch {
    // ignora
  }
};

const applyToDocument = (resolved: ThemeName, reduceTransparency: boolean) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-reduce-transparency', reduceTransparency ? 'true' : 'false');
  root.style.colorScheme = resolved;
  const color = palettes[resolved].themeColor;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<StoredPreferences>(() => readStoredPreferences());
  // sorgente di verità sincrona (aggiornata insieme a setPrefs)
  const prefsRef = useRef(prefs);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const highContrast = useMediaQuery('(prefers-contrast: more)');
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  /** l'utente ha cambiato le preferenze in questa sessione → non sovrascriverle con quelle del server */
  const changedLocally = useRef(false);

  const resolved: ThemeName = prefs.theme === 'system' ? (prefersDark ? 'dark' : 'light') : prefs.theme;

  useEffect(() => {
    ensureThemeStyle();
  }, []);

  useEffect(() => {
    applyToDocument(resolved, prefs.reduceTransparency);
  }, [resolved, prefs.reduceTransparency]);

  // All'avvio (se autenticato) legge dal server preferenze e permessi dell'utente.
  useEffect(() => {
    if (!authService.isAuthenticated()) return;
    let cancelled = false;
    apiService
      .get<User>('/auth/me')
      .then((me) => {
        if (cancelled) return;
        // ruolo e capability aggiornati (cambiati da un amministratore dopo il login)
        authService.syncFromMe(me);
        if (changedLocally.current || !hasPreferences(me?.preferences)) return;
        const next = normalizePreferences(me.preferences, prefsRef.current);
        prefsRef.current = next;
        writeStoredPreferences(next);
        setPrefs(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: UserPreferences) => {
    changedLocally.current = true;
    const next = normalizePreferences(patch, prefsRef.current);
    prefsRef.current = next;
    setPrefs(next);
    // salvataggio locale immediato, poi sul server (fire and forget)
    writeStoredPreferences(next);
    if (authService.isAuthenticated()) {
      apiService
        .put('/auth/preferences', { theme: next.theme, reduceTransparency: next.reduceTransparency })
        .catch(() => {
          message.error('Impossibile salvare le preferenze sul server');
        });
    }
  }, []);

  const setMode = useCallback((mode: ThemeMode) => update({ theme: mode }), [update]);
  const setReduceTransparency = useCallback((value: boolean) => update({ reduceTransparency: value }), [update]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: prefs.theme,
      resolved,
      reduceTransparency: prefs.reduceTransparency,
      highContrast,
      reduceMotion,
      setMode,
      setReduceTransparency,
    }),
    [prefs, resolved, highContrast, reduceMotion, setMode, setReduceTransparency],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useThemePrefs = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemePrefs deve essere usato dentro <ThemeProvider>');
  return ctx;
};
