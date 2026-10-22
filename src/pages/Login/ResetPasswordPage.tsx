import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Form, Input } from 'antd';
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { getErrorMessage } from '../../helpers/errors';
import { authService } from '../../services/AuthService';

const MIN_LENGTH = 8;

/** Pagina aperta dal link dell'email di recupero: #/reset-password?token=… */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const goToLogin = () => {
    // la password è cambiata: un eventuale login aperto non vale più
    if (authService.isAuthenticated()) authService.logout();
    else window.location.href = '/';
  };

  const onFinish = async (values: { newPassword: string }) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.post('/auth/reset-password', { token, newPassword: values.newPassword });
      setDone(true);
    } catch (err: any) {
      setError(
        err?.response?.status === 429
          ? 'Troppi tentativi: riprova tra qualche minuto'
          : getErrorMessage(err, 'Impossibile aggiornare la password'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mst-login">
      <Card className="mst-login-card" styles={{ body: { padding: 28 } }}>
        <div className="mst-login-brand">
          <img className="mst-login-logo" src="/icon.svg" alt="" aria-hidden="true" />
          <h1 className="mst-login-title">Nuova password</h1>
          <p className="mst-login-subtitle">MST Gestionale</p>
        </div>

        {!token ? (
          <>
            <Alert
              type="error"
              showIcon
              message="Link non valido"
              description="Apri il link completo ricevuto via email, oppure richiedine uno nuovo dalla pagina di accesso."
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" block size="large" onClick={goToLogin}>
              Vai all'accesso
            </Button>
          </>
        ) : done ? (
          <>
            <Alert
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              message="Password aggiornata"
              description="Ora puoi accedere con la nuova password. Gli accessi aperti su altri dispositivi sono stati chiusi."
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" block size="large" onClick={goToLogin}>
              Vai all'accesso
            </Button>
          </>
        ) : (
          <Form layout="vertical" onFinish={onFinish}>
            {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
            <Form.Item
              name="newPassword"
              label="Nuova password"
              rules={[
                { required: true, message: 'Inserisci la nuova password' },
                { min: MIN_LENGTH, message: `Almeno ${MIN_LENGTH} caratteri` },
              ]}
              hasFeedback
            >
              <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" autoFocus />
            </Form.Item>
            <Form.Item
              name="confirm"
              label="Ripeti la nuova password"
              dependencies={['newPassword']}
              hasFeedback
              rules={[
                { required: true, message: 'Ripeti la password' },
                ({ getFieldValue }) => ({
                  validator: (_, value) =>
                    !value || getFieldValue('newPassword') === value
                      ? Promise.resolve()
                      : Promise.reject(new Error('Le due password non coincidono')),
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Salva la nuova password
              </Button>
            </Form.Item>
            <Button type="text" block onClick={goToLogin}>
              Annulla
            </Button>
          </Form>
        )}
      </Card>
    </main>
  );
}
