import axios from 'axios';
import {
  hasPreferences,
  normalizePreferences,
  readStoredPreferences,
  writeStoredPreferences,
  type UserPreferences,
} from '../theme/preferences';
import { clearCacheStorage, withTimeout } from './appUpdate';

// In production, always use relative /api path to go through nginx proxy
// In development, use VITE_API_URL if set
const API_URL = import.meta.env.PROD ? '/api' : (import.meta.env.VITE_API_URL || '/api');

export interface User {
  uuid: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: {
    code: string;
    description?: string;
    capabilities?: { capability: string }[];
  };
  /** /auth/me restituisce anche le capability come semplice elenco di stringhe */
  capabilities?: string[];
  preferences?: UserPreferences;
}

export interface LoginResponse {
  access_token: string;
  expiresIn: string;
  user: User;
}

/** Pagina da riaprire dopo il login (sessione scaduta): solo hash interni dell'app. */
const RETURN_TO_KEY = 'mst_return_to';
const isSafeReturnHash = (hash: unknown): hash is string =>
  typeof hash === 'string' &&
  // "#/percorso" con caratteri da URL "normali": niente "//", schemi o salti fuori dall'app
  /^#\/(?!\/)[A-Za-z0-9\-._~/%?=&]*$/.test(hash) &&
  !hash.startsWith('#/reset-password') &&
  hash !== '#/';

/** Capability effettive dell'utente salvato (accetta entrambe le forme: login e /auth/me). */
const capabilitiesOf = (user: User | null): string[] => {
  if (!user) return [];
  if (Array.isArray(user.capabilities)) return user.capabilities;
  return (user.role?.capabilities ?? []).map((c) => c.capability).filter(Boolean);
};

class AuthService {
  private tokenKey = 'mst_token';
  private userKey = 'mst_user';
  private listeners = new Set<() => void>();
  /** cache per useSyncExternalStore: stesso oggetto finché localStorage non cambia */
  private cachedRaw: string | null | undefined = undefined;
  private cachedUser: User | null = null;

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getUser(): User | null {
    let userStr: string | null = null;
    try {
      userStr = localStorage.getItem(this.userKey);
    } catch {
      return null;
    }
    if (userStr === this.cachedRaw) return this.cachedUser;
    this.cachedRaw = userStr;
    try {
      this.cachedUser = userStr ? JSON.parse(userStr) : null;
    } catch {
      this.cachedUser = null;
    }
    return this.cachedUser;
  }

  /** Per useSyncExternalStore: notifica quando utente/capability salvati cambiano. */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): User | null => this.getUser();

  private saveUser(user: User): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this.listeners.forEach((l) => l());
  }

  /**
   * Aggiorna utente e permessi salvati con quelli di /auth/me: se un amministratore ha cambiato il ruolo
   * o le capability, l'utente li vede al prossimo avvio dell'app senza dover rifare il login.
   */
  syncFromMe(me: User | null | undefined): void {
    if (!me?.uuid || !this.isAuthenticated()) return;
    const current = this.getUser();
    const next: User = {
      uuid: me.uuid,
      username: me.username,
      firstName: me.firstName ?? undefined,
      lastName: me.lastName ?? undefined,
      email: me.email ?? undefined,
      role: me.role
        ? {
            code: me.role.code,
            description: me.role.description,
            capabilities: (me.role.capabilities ?? []).map((c) => ({ capability: c.capability })),
          }
        : undefined,
      capabilities: Array.isArray(me.capabilities) ? me.capabilities : capabilitiesOf({ ...me, capabilities: undefined }),
      preferences: current?.preferences,
    };
    const same =
      current?.uuid === next.uuid &&
      current?.username === next.username &&
      current?.firstName === next.firstName &&
      current?.lastName === next.lastName &&
      current?.role?.code === next.role?.code &&
      [...capabilitiesOf(current)].sort().join(',') === [...capabilitiesOf(next)].sort().join(',');
    if (!same) this.saveUser(next);
  }

  async login(username: string, password: string): Promise<LoginResponse> {
    const response = await axios.post<LoginResponse>(`${API_URL}/auth/login`, {
      username,
      password,
    });

    const { access_token, user } = response.data;
    localStorage.setItem(this.tokenKey, access_token);
    this.saveUser(user);

    // preferenze di aspetto dell'utente → localStorage (lette prima del render, niente flash)
    if (hasPreferences(user?.preferences)) {
      writeStoredPreferences(normalizePreferences(user.preferences, readStoredPreferences()));
    }

    return response.data;
  }

  /**
   * Esce e torna al login. Con `rememberPage` (sessione scaduta, 401) ricorda la pagina corrente
   * per riaprirla dopo il nuovo accesso.
   */
  logout(options: { rememberPage?: boolean } = {}): void {
    try {
      if (options.rememberPage && isSafeReturnHash(window.location.hash)) {
        sessionStorage.setItem(RETURN_TO_KEY, window.location.hash);
      } else if (!options.rememberPage) {
        sessionStorage.removeItem(RETURN_TO_KEY);
      }
    } catch {
      // sessionStorage non disponibile: si torna semplicemente alla Dashboard
    }
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    // le preferenze (mst_prefs) restano: la pagina di login mantiene il tema.
    // Svuota Cache Storage (best effort, al massimo 1,5 s di attesa).
    withTimeout(clearCacheStorage(), 1500).finally(() => {
      window.location.href = '/';
    });
  }

  /** Legge (e cancella) la pagina da riaprire dopo il login; null se assente o non valida. */
  consumeReturnTo(): string | null {
    try {
      const hash = sessionStorage.getItem(RETURN_TO_KEY);
      sessionStorage.removeItem(RETURN_TO_KEY);
      return isSafeReturnHash(hash) ? hash : null;
    } catch {
      return null;
    }
  }

  hasCapability(capability: string): boolean {
    return capabilitiesOf(this.getUser()).includes(capability);
  }

  getAuthHeader(): { Authorization: string } | {} {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  }
}

export const authService = new AuthService();
