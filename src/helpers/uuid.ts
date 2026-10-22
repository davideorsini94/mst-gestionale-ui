/** UUID ben formato: un indirizzo con un identificativo storpiato è "non trovato" senza interrogare il server. */
export const isUuid = (value: string | undefined): value is string =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
