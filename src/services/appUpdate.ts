/**
 * Aggiornamenti affidabili della PWA (niente schermata bianca dopo un deploy).
 */

const RELOAD_GUARD_KEY = 'mst_sw_reload_at';
let pendingReload = false;

/** Svuota Cache Storage (best effort). */
export const clearCacheStorage = async (): Promise<void> => {
  try {
    if (typeof caches === 'undefined') return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    // ignora
  }
};

/** Deregistra tutti i service worker (best effort). */
export const unregisterServiceWorkers = async (): Promise<void> => {
  try {
    if (!('serviceWorker' in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  } catch {
    // ignora
  }
};

/** Risolve dopo `ms` anche se la promessa non è terminata. */
export const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | void> =>
  Promise.race([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]);

/** "Ricarica" dalla pagina di errore: azzera SW e cache e ricarica. */
export const hardReload = async (): Promise<void> => {
  await withTimeout(Promise.all([unregisterServiceWorkers(), clearCacheStorage()]), 3000);
  window.location.reload();
};

/**
 * Registra il service worker:
 *  - controlla aggiornamenti quando l'app torna visibile;
 *  - quando un nuovo SW prende il controllo ricarica la pagina UNA volta
 *    (guardia in sessionStorage contro i loop).
 */
export const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator)) return;

  // se all'avvio non c'era un controller è la prima installazione: niente reload
  const hadController = !!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    try {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
      if (Date.now() - last < 10_000) return;
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
    } catch {
      // sessionStorage non disponibile: ricarichiamo comunque una volta sola
      if ((window as unknown as { __mstReloaded?: boolean }).__mstReloaded) return;
      (window as unknown as { __mstReloaded?: boolean }).__mstReloaded = true;
    }
    // Non si ricarica subito (si perderebbe un form compilato a metà): la nuova versione viene caricata al
    // prossimo cambio di pagina, avvisando l'utente.
    if (pendingReload) return;
    pendingReload = true;
    void import('./notify').then(({ message }) =>
      message.info('Nuova versione disponibile: verrà caricata al prossimo cambio di pagina', 6),
    );
    window.addEventListener('hashchange', () => window.location.reload(), { once: true });
  });

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => undefined);
          }
        });
      })
      .catch((error) => {
        console.log('Registrazione Service Worker fallita:', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }
};
