import { useState } from 'react';
import { useRouteError } from 'react-router-dom';
import { Button, Result } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { hardReload } from '../services/appUpdate';

/**
 * errorElement dei router: al posto della schermata bianca mostra un messaggio
 * e un pulsante "Ricarica" che deregistra i service worker, svuota le cache e ricarica.
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  const [reloading, setReloading] = useState(false);

  if (error) {
    console.error('Errore di navigazione:', error);
  }

  const handleReload = () => {
    setReloading(true);
    hardReload();
  };

  return (
    <div className="mst-error-page">
      <div className="mst-error-card">
        <Result
          status="warning"
          title="Qualcosa è andato storto"
          subTitle="Potrebbe essere disponibile una nuova versione dell'applicazione. Ricarica per aggiornarla: i tuoi dati non verranno persi."
          extra={
            <Button type="primary" size="large" icon={<ReloadOutlined />} loading={reloading} onClick={handleReload}>
              Ricarica
            </Button>
          }
        />
      </div>
    </div>
  );
}
