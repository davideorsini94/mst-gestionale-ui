import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Result } from 'antd';
import { useCapability } from '../hooks/useAuth';

/** 403 dentro il layout: la navigazione resta usabile. */
export function ForbiddenPage() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="Accesso negato"
      subTitle="Non hai i permessi per vedere questa pagina. Se ti servono, chiedi a un amministratore."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Torna alla Dashboard
        </Button>
      }
    />
  );
}

/** 404 dentro il layout (rotta inesistente o record non trovato). */
export function NotFoundPage({
  title = 'Pagina non trovata',
  subTitle = "L'indirizzo non corrisponde a nessuna pagina dell'applicazione.",
  backTo = '/',
  backLabel = 'Torna alla Dashboard',
}: {
  title?: string;
  subTitle?: string;
  backTo?: string;
  backLabel?: string;
}) {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title={title}
      subTitle={subTitle}
      extra={
        <Button type="primary" onClick={() => navigate(backTo)}>
          {backLabel}
        </Button>
      }
    />
  );
}

/**
 * Protegge una rotta: senza la capability mostra il 403 invece di montare la pagina
 * (niente chiamate destinate a fallire, niente toast d'errore doppi).
 */
export function RequireCapability({ capability, children }: { capability: string; children: ReactNode }) {
  const allowed = useCapability(capability);
  return allowed ? <>{children}</> : <ForbiddenPage />;
}

/**
 * Contenuto di una tabella che non è riuscita a caricarsi: senza, l'errore compariva come "Nessun dato" e
 * sembrava una lista davvero vuota.
 */
export function LoadErrorEmpty({ onRetry }: { onRetry: () => void }) {
  return (
    <Result
      status="warning"
      title="Impossibile caricare l'elenco"
      subTitle="Controlla la connessione e riprova."
      extra={
        <Button type="primary" onClick={onRetry}>
          Riprova
        </Button>
      }
    />
  );
}
