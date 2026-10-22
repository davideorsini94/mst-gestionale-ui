/**
 * Messaggio d'errore del server (NestJS: `message` stringa o elenco di errori di validazione),
 * con un testo di ripiego se manca.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { message?: unknown } } })?.response?.data;
  const msg = data?.message;
  if (Array.isArray(msg)) {
    const parts = msg.filter((m) => typeof m === 'string' && m.trim());
    if (parts.length) return parts.join('; ');
  }
  if (typeof msg === 'string' && msg.trim()) return msg;
  return fallback;
}

/** Stato HTTP della risposta d'errore (undefined se la richiesta non è arrivata al server). */
export const getErrorStatus = (error: unknown): number | undefined =>
  (error as { response?: { status?: number } })?.response?.status;

/** Stringa vuota o solo spazi → null (il backend non accetta "" per email e campi simili). */
export const emptyToNull = <T,>(value: T): T | null =>
  typeof value === 'string' && value.trim() === '' ? null : value;
