import { useCallback, useEffect, useRef } from 'react';

/**
 * Per caricamenti che possono sovrapporsi (filtri, pagine, ricerca): `begin()` segna una nuova richiesta
 * e restituisce `isCurrent()`, falso se nel frattempo ne è partita un'altra o la pagina è stata chiusa.
 * Così una risposta lenta di una richiesta vecchia non sovrascrive quella più recente.
 */
export function useLatestRequest() {
  const counter = useRef(0);
  useEffect(
    () => () => {
      // pagina smontata: tutte le risposte in arrivo vanno ignorate
      counter.current += 1;
    },
    [],
  );
  return useCallback(() => {
    const id = ++counter.current;
    return () => id === counter.current;
  }, []);
}
