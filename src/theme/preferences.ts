/**
 * Preferenze di aspetto (tema + riduci trasparenza) salvate in localStorage.
 * La stessa chiave/forma è letta dallo script inline in index.html: tenerli allineati.
 * Ogni accesso a localStorage è protetto (Safari privato, storage bloccato…).
 */

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserPreferences {
  theme?: ThemeMode;
  reduceTransparency?: boolean;
}

export interface StoredPreferences {
  theme: ThemeMode;
  reduceTransparency: boolean;
}

export const PREFS_STORAGE_KEY = 'mst_prefs';

export const DEFAULT_PREFERENCES: StoredPreferences = {
  theme: 'system',
  reduceTransparency: false,
};

export const isThemeMode = (v: unknown): v is ThemeMode =>
  v === 'light' || v === 'dark' || v === 'system';

/** Normalizza un oggetto preferenze (es. arrivato dal server) completando i default. */
export const normalizePreferences = (
  value: UserPreferences | null | undefined,
  base: StoredPreferences = DEFAULT_PREFERENCES,
): StoredPreferences => ({
  theme: isThemeMode(value?.theme) ? value!.theme! : base.theme,
  reduceTransparency:
    typeof value?.reduceTransparency === 'boolean' ? value.reduceTransparency : base.reduceTransparency,
});

export const readStoredPreferences = (): StoredPreferences => {
  try {
    const raw = window.localStorage.getItem(PREFS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFERENCES };
    return normalizePreferences(JSON.parse(raw) as UserPreferences);
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
};

export const writeStoredPreferences = (prefs: StoredPreferences): void => {
  try {
    window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // storage non disponibile: le preferenze restano solo in memoria
  }
};

/** Ha almeno un campo valido? (per decidere se applicare le preferenze del server) */
export const hasPreferences = (value: UserPreferences | null | undefined): boolean =>
  !!value && (isThemeMode(value.theme) || typeof value.reduceTransparency === 'boolean');
