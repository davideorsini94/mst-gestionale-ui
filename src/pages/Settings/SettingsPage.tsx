import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Divider, List, InputNumber, Tabs, Switch, Alert, Upload, Table, Popconfirm, Space, Tag } from 'antd';
import { SaveOutlined, MailOutlined, SettingOutlined, DatabaseOutlined, CloudDownloadOutlined, DeleteOutlined, UploadOutlined, CloudServerOutlined } from '@ant-design/icons';
import { apiService, getApiBaseUrl } from '@services/ApiService.ts';

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
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState<string | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);

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

  const loadBackups = async () => {
    setLoadingBackups(true);
    try {
      const data = await apiService.get<any[]>('/settings/backup/list');
      setBackups(data);
    } catch (error) {
      message.error('Errore nel caricamento dei backup');
    } finally {
      setLoadingBackups(false);
    }
  };

  const handleCreateBackup = async (type: 'database' | 'minio' | 'full') => {
    setCreatingBackup(type);
    try {
      const endpoint = type === 'full' ? '/settings/backup/full' : `/settings/backup/${type}`;
      await apiService.post(endpoint);
      message.success(`Backup ${type} creato con successo`);
      loadBackups();
    } catch (error: any) {
      message.error(error?.response?.data?.message || `Errore nella creazione del backup ${type}`);
    } finally {
      setCreatingBackup(null);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      window.open(`${getApiBaseUrl()}/settings/backup/download/${filename}`, '_blank');
    } catch (error) {
      message.error('Errore nel download del backup');
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await apiService.delete(`/settings/backup/${filename}`);
      message.success('Backup eliminato');
      loadBackups();
    } catch (error) {
      message.error('Errore nella cancellazione del backup');
    }
  };

  const handleRestoreBackup = async (file: File, type: 'database' | 'minio') => {
    setRestoringBackup(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await apiService.post(`/settings/restore/${type}`, formData);
      message.success(`${type === 'database' ? 'Database' : 'MinIO'} ripristinato con successo`);
      message.warning('Ricaricare la pagina per vedere i cambiamenti');
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Errore nel ripristino');
    } finally {
      setRestoringBackup(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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
    {
      key: 'backup',
      label: (
        <span>
          <DatabaseOutlined />
          Backup & Restore
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Alert
            message="Attenzione"
            description="Le operazioni di backup e restore sono critiche. Assicurati di avere i permessi necessari e di capire le conseguenze prima di procedere. Il restore sovrascriverà i dati esistenti."
            type="warning"
            showIcon
            className="mb-4"
          />

          <Card title="Crea Backup">
            <div className="grid grid-cols-3 gap-4">
              <Button
                type="primary"
                icon={<DatabaseOutlined />}
                loading={creatingBackup === 'database'}
                onClick={() => handleCreateBackup('database')}
                block
              >
                Backup Database
              </Button>
              <Button
                type="primary"
                icon={<CloudServerOutlined />}
                loading={creatingBackup === 'minio'}
                onClick={() => handleCreateBackup('minio')}
                block
              >
                Backup MinIO
              </Button>
              <Button
                type="primary"
                danger
                icon={<SaveOutlined />}
                loading={creatingBackup === 'full'}
                onClick={() => handleCreateBackup('full')}
                block
              >
                Backup Completo
              </Button>
            </div>
          </Card>

          <Card 
            title="Backup Disponibili" 
            extra={
              <Button icon={<CloudDownloadOutlined />} onClick={loadBackups} loading={loadingBackups}>
                Ricarica
              </Button>
            }
          >
            <Table
              dataSource={backups}
              loading={loadingBackups}
              rowKey="filename"
              columns={[
                {
                  title: 'Nome File',
                  dataIndex: 'filename',
                  key: 'filename',
                },
                {
                  title: 'Tipo',
                  dataIndex: 'type',
                  key: 'type',
                  render: (type: string) => (
                    <Tag color={type === 'database' ? 'blue' : 'green'}>
                      {type === 'database' ? 'Database' : 'MinIO'}
                    </Tag>
                  ),
                },
                {
                  title: 'Dimensione',
                  dataIndex: 'size',
                  key: 'size',
                  render: (size: number) => formatBytes(size),
                },
                {
                  title: 'Data Creazione',
                  dataIndex: 'createdAt',
                  key: 'createdAt',
                  render: (date: string) => new Date(date).toLocaleString('it-IT'),
                },
                {
                  title: 'Azioni',
                  key: 'actions',
                  render: (_: any, record: any) => (
                    <Space>
                      <Button
                        type="link"
                        icon={<CloudDownloadOutlined />}
                        onClick={() => handleDownloadBackup(record.filename)}
                      >
                        Scarica
                      </Button>
                      <Popconfirm
                        title="Eliminare questo backup?"
                        onConfirm={() => handleDeleteBackup(record.filename)}
                        okText="Sì"
                        cancelText="No"
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          Elimina
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          </Card>

          <Card title="Ripristina da Backup">
            <Alert
              message="Attenzione: Operazione Irreversibile"
              description="Il ripristino sovrascriverà tutti i dati esistenti. Assicurati di aver creato un backup prima di procedere."
              type="error"
              showIcon
              className="mb-4"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Ripristina Database</h3>
                <Upload
                  accept=".sql"
                  beforeUpload={(file) => {
                    handleRestoreBackup(file, 'database');
                    return false;
                  }}
                  showUploadList={false}
                  disabled={restoringBackup}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={restoringBackup}
                    block
                  >
                    Carica Backup Database (.sql)
                  </Button>
                </Upload>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Ripristina MinIO</h3>
                <Upload
                  accept=".tar"
                  beforeUpload={(file) => {
                    handleRestoreBackup(file, 'minio');
                    return false;
                  }}
                  showUploadList={false}
                  disabled={restoringBackup}
                >
                  <Button
                    icon={<UploadOutlined />}
                    loading={restoringBackup}
                    block
                  >
                    Carica Backup MinIO (.tar)
                  </Button>
                </Upload>
              </div>
            </div>
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
