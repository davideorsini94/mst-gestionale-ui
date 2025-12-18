import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Divider, List, InputNumber, Tabs, Switch, Alert } from 'antd';
import { SaveOutlined, MailOutlined, SettingOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';

interface Setting {
  key: string;
  value: unknown;
  description?: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [smtpForm] = Form.useForm();
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [savingAdminEmail, setSavingAdminEmail] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiService.get<Setting[]>('/settings');
      setSettings(data);
      
      // Carica configurazione SMTP
      const smtpSetting = data.find(s => s.key === 'smtpConfig');
      if (smtpSetting?.value) {
        smtpForm.setFieldsValue(smtpSetting.value as SmtpConfig);
      }
      
      // Carica email admin
      const adminEmailSetting = data.find(s => s.key === 'adminEmail');
      if (adminEmailSetting?.value) {
        setAdminEmail(adminEmailSetting.value as string);
      }
    } catch (error) {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: { key: string; value: string; description?: string }) => {
    try {
      await apiService.post('/settings', {
        key: values.key,
        value: values.value,
        description: values.description,
      });
      message.success('Impostazione salvata');
      form.resetFields();
      loadSettings();
    } catch (error) {
      message.error('Errore nel salvataggio');
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await apiService.delete(`/settings/${key}`);
      message.success('Impostazione eliminata');
      loadSettings();
    } catch (error) {
      message.error('Errore nella cancellazione');
    }
  };

  const handleSaveSmtp = async (values: SmtpConfig) => {
    setSavingSmtp(true);
    try {
      await apiService.post('/settings', {
        key: 'smtpConfig',
        value: values,
        description: 'Configurazione SMTP per invio email',
      });
      message.success('Configurazione SMTP salvata');
    } catch (error) {
      message.error('Errore nel salvataggio');
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleSaveAdminEmail = async () => {
    setSavingAdminEmail(true);
    try {
      await apiService.post('/settings', {
        key: 'adminEmail',
        value: adminEmail,
        description: 'Email amministratore per notifiche e reminder',
      });
      message.success('Email admin salvata');
    } catch (error) {
      message.error('Errore nel salvataggio');
    } finally {
      setSavingAdminEmail(false);
    }
  };

  // Filtra le impostazioni per non mostrare quelle gestite separatamente
  const filteredSettings = settings.filter(s => !['smtpConfig', 'adminEmail'].includes(s.key));

  const tabItems = [
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined />
          Email & SMTP
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Card title="Configurazione SMTP" className="mb-4">
            <Alert
              message="Configurazione Email"
              description="Configura il server SMTP per l'invio di email di notifica e reminder scadenze."
              type="info"
              showIcon
              className="mb-4"
            />
            <Form form={smtpForm} layout="vertical" onFinish={handleSaveSmtp}>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="host" label="Host SMTP" rules={[{ required: true }]}>
                  <Input placeholder="es. smtp.gmail.com" />
                </Form.Item>
                <Form.Item name="port" label="Porta" rules={[{ required: true }]}>
                  <InputNumber min={1} max={65535} placeholder="587" className="w-full" />
                </Form.Item>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Form.Item name="user" label="Username" rules={[{ required: true }]}>
                  <Input placeholder="es. noreply@example.com" />
                </Form.Item>
                <Form.Item name="pass" label="Password" rules={[{ required: true }]}>
                  <Input.Password placeholder="Password SMTP" />
                </Form.Item>
              </div>
              <Form.Item name="from" label="Indirizzo Mittente">
                <Input placeholder="es. Gestionale <noreply@example.com>" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" loading={savingSmtp} icon={<SaveOutlined />}>
                  Salva Configurazione SMTP
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="Email Amministratore">
            <p className="mb-4 text-gray-600">
              Questa email riceverà le notifiche di sistema e i reminder per le scadenze dei veicoli.
            </p>
            <div className="flex gap-2">
              <Input
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="es. admin@example.com"
                type="email"
                className="max-w-md"
              />
              <Button
                type="primary"
                loading={savingAdminEmail}
                onClick={handleSaveAdminEmail}
                icon={<SaveOutlined />}
              >
                Salva
              </Button>
            </div>
          </Card>
        </div>
      ),
    },
    {
      key: 'general',
      label: (
        <span>
          <SettingOutlined />
          Impostazioni Generali
        </span>
      ),
      children: (
        <div>
          <Card title="Nuova Impostazione" className="mb-4">
            <Form form={form} layout="inline" onFinish={handleSave}>
              <Form.Item name="key" rules={[{ required: true }]}>
                <Input placeholder="Chiave" />
              </Form.Item>
              <Form.Item name="value" rules={[{ required: true }]}>
                <Input placeholder="Valore" />
              </Form.Item>
              <Form.Item name="description">
                <Input placeholder="Descrizione" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit">
                  Salva
                </Button>
              </Form.Item>
            </Form>
          </Card>

          <Card title="Impostazioni Correnti" loading={loading}>
            <List
              dataSource={filteredSettings}
              locale={{ emptyText: 'Nessuna impostazione' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button danger onClick={() => handleDelete(item.key)}>
                      Elimina
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={item.key}
                    description={`${JSON.stringify(item.value)} - ${item.description || ''}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Impostazioni</h1>
      <Tabs items={tabItems} defaultActiveKey="email" />
    </div>
  );
}
