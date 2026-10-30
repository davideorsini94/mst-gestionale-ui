/** Stato del backup automatico notturno (GET /settings/backup/status) */
export interface NightlyBackupStatus {
  enabled: boolean;
  time: string;
  maxPerType: number;
  processStartedAt: string;
  last: { startedAt: string; finishedAt: string; ok: boolean; errors: string[]; lastSuccessAt: string | null } | null;
}

/** Oltre questo tempo senza un backup notturno riuscito l'avviso diventa evidente (una notte saltata + margine). */
const NIGHTLY_STALE_MS = 36 * 60 * 60 * 1000;

export const formatDateTime = (iso: string) => new Date(iso).toLocaleString('it-IT');

/**
 * Problema del backup automatico da segnalare agli admin, o null se va tutto bene (o se è spento: è una scelta di
 * configurazione, segnalata solo nella pagina dei backup).
 * - error: l'ultimo backup notturno non è riuscito
 * - warning: nessun backup notturno riuscito da più di 36 ore (senza nessuno riuscito si conta dall'avvio del server,
 *   così l'avviso compare anche se il job non parte mai)
 */
export function nightlyBackupProblem(
  status: NightlyBackupStatus | null,
): { type: 'error' | 'warning'; title: string; details: string[] } | null {
  if (!status?.enabled) return null;
  const { last } = status;
  const lastSuccess = last?.lastSuccessAt
    ? `Ultimo backup automatico riuscito: ${formatDateTime(last.lastSuccessAt)}.`
    : 'Nessun backup automatico è ancora riuscito.';
  if (last && !last.ok) {
    return {
      type: 'error',
      title: `Ultimo backup automatico non riuscito (${formatDateTime(last.finishedAt)})`,
      details: [...last.errors, lastSuccess],
    };
  }
  const since = last?.lastSuccessAt ?? status.processStartedAt;
  if (Date.now() - new Date(since).getTime() > NIGHTLY_STALE_MS) {
    return { type: 'warning', title: 'Nessun backup automatico riuscito da più di un giorno', details: [lastSuccess] };
  }
  return null;
}
