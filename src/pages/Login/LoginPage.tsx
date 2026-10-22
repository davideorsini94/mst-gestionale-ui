import { useState } from 'react';
import { Form, Input, Button, Card, Alert } from 'antd';
import { UserOutlined, LockOutlined, ArrowLeftOutlined, MailOutlined } from '@ant-design/icons';
import { authService } from '../../services/AuthService';
import { apiService } from '../../services/ApiService';

type Mode = 'login' | 'forgot' | 'sent';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('login');
  const [sentMessage, setSentMessage] = useState('');

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await authService.login(values.username, values.password);
      // dopo una sessione scaduta riapre la pagina in cui si era (solo indirizzi interni dell'app)
      const returnTo = authService.consumeReturnTo();
      if (returnTo) window.location.hash = returnTo;
      window.location.reload();
    } catch (err: any) {
      console.error('Login error:', err);
      const raw = err?.response?.data?.message || err?.message;
      const errorMsg = err?.response?.status === 401 || raw === 'Unauthorized' ? 'Nome utente o password non corretti' : raw || 'Credenziali non valide';
      // il messaggio compare nel riquadro sopra il form (prima anche in un toast identico)
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (values: { identifier: string }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.post<{ message: string }>('/auth/forgot-password', { identifier: values.identifier.trim() });
      setSentMessage(res.message);
      setMode('sent');
    } catch (err: any) {
      setError(
        err?.response?.status === 429
          ? 'Troppe richieste: riprova tra qualche minuto'
          : err?.response?.data?.message || 'Richiesta non riuscita: riprova',
      );
    } finally {
      setLoading(false);
    }
  };

  const backToLogin = () => {
    setError(null);
    setMode('login');
  };

  const subtitle = mode === 'login' ? 'Accedi per continuare' : 'Recupero password';

  return (
    <main className="mst-login">
      <Card className="mst-login-card" styles={{ body: { padding: 28 } }}>
        <div className="mst-login-brand">
          <img className="mst-login-logo" src="/icon.svg" alt="" aria-hidden="true" />
          <h1 className="mst-login-title">MST Gestionale</h1>
          <p className="mst-login-subtitle">{subtitle}</p>
        </div>
        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {mode === 'login' && (
          <Form name="login" onFinish={onFinish} layout="vertical" autoComplete="on">
            <Form.Item name="username" rules={[{ required: true, message: 'Inserisci username' }]}>
              <Input
                prefix={<UserOutlined />}
                placeholder="Username"
                size="large"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: 'Inserisci password' }]} style={{ marginBottom: 8 }}>
              <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" autoComplete="current-password" />
            </Form.Item>
            <div className="mst-login-forgot">
              <Button type="link" size="small" onClick={() => { setError(null); setMode('forgot'); }}>
                Password dimenticata?
              </Button>
            </div>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Accedi
              </Button>
            </Form.Item>
          </Form>
        )}

        {mode === 'forgot' && (
          <Form name="forgot" onFinish={onForgot} layout="vertical">
            <p className="mst-login-help">
              Scrivi il tuo nome utente o l'email del tuo account: ti invieremo un link per scegliere una nuova password.
            </p>
            <Form.Item name="identifier" rules={[{ required: true, whitespace: true, message: 'Inserisci nome utente o email' }]}>
              <Input
                prefix={<UserOutlined />}
                placeholder="Nome utente o email"
                size="large"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                autoFocus
              />
            </Form.Item>
            <Form.Item style={{ marginBottom: 12 }}>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" icon={<MailOutlined />}>
                Invia link di recupero
              </Button>
            </Form.Item>
            <Button type="text" block icon={<ArrowLeftOutlined />} onClick={backToLogin}>
              Torna all'accesso
            </Button>
          </Form>
        )}

        {mode === 'sent' && (
          <div>
            <Alert type="success" showIcon message="Richiesta inviata" description={sentMessage} style={{ marginBottom: 16 }} />
            <p className="mst-login-help">
              Il link vale 30 minuti. Se non arriva, controlla lo spam; se il tuo account non ha un'email, chiedi a un
              amministratore di reimpostare la password.
            </p>
            <Button type="primary" block size="large" icon={<ArrowLeftOutlined />} onClick={backToLogin}>
              Torna all'accesso
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
