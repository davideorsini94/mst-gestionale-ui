import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Grid } from 'antd';
import { apiService } from '@services/ApiService.ts';
import { authService } from '../services/AuthService';
import { nightlyBackupProblem, type NightlyBackupStatus } from '../helpers/backupStatus';

/** Ogni quanto si ricontrolla lo stato con l'app aperta (il backup gira una volta a notte). */
const REFRESH_MS = 30 * 60 * 1000;

/**
 * Avviso in cima a ogni pagina, solo per chi gestisce i backup (admin): backup notturno non riuscito o fermo da più
 * di un giorno. Si può chiudere; ricompare al prossimo controllo se il problema resta.
 */
export default function BackupStatusBanner() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isMobile = !Grid.useBreakpoint().md;
  const [status, setStatus] = useState<NightlyBackupStatus | null>(null);
  const [closedAt, setClosedAt] = useState<number | null>(null);
  const canManageBackup = authService.hasCapability('CAN_MANAGE_BACKUP');

  useEffect(() => {
    if (!canManageBackup) return;
    const load = () =>
      apiService.get<NightlyBackupStatus>('/settings/backup/status').then(
        (data) => {
          setStatus(data);
          setClosedAt(null);
        },
        () => undefined, // solo informativo: un errore qui non deve disturbare
      );
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [canManageBackup]);

  const problem = canManageBackup ? nightlyBackupProblem(status) : null;
  // in Impostazioni la scheda Backup mostra già lo stesso avviso, più completo
  if (!problem || closedAt || pathname.startsWith('/settings')) return null;

  const goToBackups = (
    <Button size="small" onClick={() => navigate('/settings?tab=backup')}>
      Vai ai backup
    </Button>
  );
  return (
    <Alert
      className="mb-4"
      type={problem.type}
      showIcon
      closable
      onClose={() => setClosedAt(Date.now())}
      message={problem.title}
      description={
        <>
          {problem.details.map((d) => <div key={d}>{d}</div>)}
          {/* su telefono il pulsante a destra stringerebbe il testo in una colonna: va sotto */}
          {isMobile && <div className="mt-2">{goToBackups}</div>}
        </>
      }
      action={isMobile ? undefined : goToBackups}
    />
  );
}
