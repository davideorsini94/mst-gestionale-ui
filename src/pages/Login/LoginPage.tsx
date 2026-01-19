import { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
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
    <div
      className="min-h-screen flex items-center justify-center bg-gray-100"
      style={{
        padding: '16px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        minHeight: '100dvh',
      }}
    >
      <Card
        title="MST Gestionale - Login"
        className="w-full max-w-sm"
        styles={{ header: { textAlign: 'center' } }}
      >
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
    </div>
  );
}
