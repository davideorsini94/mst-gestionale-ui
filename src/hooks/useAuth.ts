import { useSyncExternalStore } from 'react';
import { authService, type User } from '../services/AuthService';

/** Utente salvato; si aggiorna quando /auth/me porta ruolo o permessi nuovi. */
export const useCurrentUser = (): User | null =>
  useSyncExternalStore(authService.subscribe, authService.getSnapshot, authService.getSnapshot);

/** true se l'utente ha la capability (reattivo agli aggiornamenti dei permessi). */
export const useCapability = (capability: string): boolean => {
  useCurrentUser();
  return authService.hasCapability(capability);
};
