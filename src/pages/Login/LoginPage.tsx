import { useState } from 'react';
import { Form, Input, Button, Card, Alert } from 'antd';
import { message } from '../../services/notify';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authService } from '../../services/AuthService';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      await authService.login(values.username, values.password);
      window.location.reload();
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMsg = err?.response?.data?.message || err?.message || 'Credenziali non valide';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mst-login">
      <Card className="mst-login-card" styles={{ body: { padding: 28 } }}>
        <div className="mst-login-brand">
          <span className="mst-brand-mark" aria-hidden="true">MST</span>
          <h1 className="mst-login-title">MST Gestionale</h1>
          <p className="mst-login-subtitle">Accedi per continuare</p>
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
        <Form name="login" onFinish={onFinish} layout="vertical" autoComplete="on">
          <Form.Item
            name="username"
            rules={[{ required: true, message: 'Inserisci username' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Username"
              size="large"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Inserisci password' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">
              Accedi
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </main>
  );
}
