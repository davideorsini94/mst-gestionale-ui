import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { App, Card, Form, Input, Button, Divider, List, InputNumber, Tabs, Switch, Alert, Upload, Table, Popconfirm, Space, Tag, Grid, Result } from 'antd';
import { message } from '../../services/notify';
import { SaveOutlined, SendOutlined, MailOutlined, SettingOutlined, DatabaseOutlined, CloudDownloadOutlined, DeleteOutlined, UploadOutlined, CloudServerOutlined, LockOutlined } from '@ant-design/icons';
import { apiService, getApiBaseUrl } from '@services/ApiService.ts';
import { getErrorMessage } from '../../helpers/errors';
import { authService } from '../../services/AuthService';

const { useBreakpoint } = Grid;

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
  /** Il server non restituisce mai la password: indica solo se ne è salvata una */
  hasPassword?: boolean;
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [smtpHasPassword, setSmtpHasPassword] = useState(false);
  const [form] = Form.useForm();
  const [smtpForm] = Form.useForm();
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [adminEmail, setAdminEmail] = useState('');
  const [savingAdminEmail, setSavingAdminEmail] = useState(false);
  // conferme a tema (Modal.confirm statico resterebbe chiaro)
  const { modal } = App.useApp();
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState<string | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const canAccessSettings = authService.hasCapability('CAN_MANAGE_SETTINGS');

  useEffect(() => {
    if (canAccessSettings) {
      loadSettings();
    }
  }, [canAccessSettings]);

  if (!canAccessSettings) {
    return (
      <Result
        status="403"
        title="Accesso Negato"
        subTitle="Non hai i permessi per accedere a questa pagina."
        extra={<Button type="primary" onClick={() => navigate('/')}>Torna alla Home</Button>}
      />
    );
  }

  const loadSettings = async () => {
    try {
      const data = await apiService.get<Setting[]>('/settings');
      setSettings(data);

      // Carica configurazione SMTP
      const smtpSetting = data.find(s => s.key === 'smtpConfig');
      if (smtpSetting?.value) {
        const { hasPassword, ...smtpValues } = smtpSetting.value as SmtpConfig;
        setSmtpHasPassword(!!hasPassword);
        smtpForm.setFieldsValue({ ...smtpValues, pass: '' });
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
      message.error(getErrorMessage(error, "Errore nel salvataggio dell'impostazione"));
    }
  };

  const handleDelete = async (key: string) => {
    try {
      await apiService.delete(`/settings/${key}`);
      message.success('Impostazione eliminata');
      loadSettings();
    } catch (error) {
      message.error(getErrorMessage(error, "Errore nell'eliminazione dell'impostazione"));
    }
  };

  /** Invio di prova con i valori attuali del form (anche non salvati); password vuota = quella salvata. */
  const handleSendTestEmail = async () => {
    const to = testEmailTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      message.error('Inserisci un indirizzo email valido');
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      const values = smtpForm.getFieldsValue() as SmtpConfig;
      const res = await apiService.post<{ message: string; usedHost: string }>(
        '/settings/smtp/test',
        { to, config: { ...values, port: values.port ? Number(values.port) : undefined } },
        { timeout: 60_000 },
      );
      setTestResult({ ok: true, text: `${res.message} (server ${res.usedHost}). Controlla la casella, anche nello spam.` });
    } catch (error: any) {
      setTestResult({ ok: false, text: getErrorMessage(error, 'Invio non riuscito') });
    } finally {
      setSendingTest(false);
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
      if (values.pass) setSmtpHasPassword(true);
      smtpForm.setFieldValue('pass', '');
      message.success('Configurazione SMTP salvata');
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel salvataggio della configurazione SMTP'));
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
      message.error(getErrorMessage(error, "Errore nel salvataggio dell'email amministratore"));
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
      message.error(getErrorMessage(error, `Errore nella creazione del backup ${type}`));
    } finally {
      setCreatingBackup(null);
    }
  };

  const handleDownloadBackup = async (filename: string) => {
    try {
      // un download diretto non invia l'header Authorization: il server dà un biglietto monouso valido 60 secondi
      // (un backup può pesare GB, quindi niente download in memoria come per i PDF)
      const { ticket } = await apiService.post<{ ticket: string }>(
        `/settings/backup/download-ticket/${encodeURIComponent(filename)}`,
        {},
      );
      // il server risponde come allegato: un link nella stessa pagina scarica il file senza aprire schede
      // (window.open dopo un await viene bloccato da Safari/iOS)
      const a = document.createElement('a');
      a.href = `${getApiBaseUrl()}/settings/backup/download/${encodeURIComponent(filename)}?ticket=${encodeURIComponent(ticket)}`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel download del backup'));
    }
  };

  const handleDeleteBackup = async (filename: string) => {
    try {
      await apiService.delete(`/settings/backup/${filename}`);
      message.success('Backup eliminato');
      loadBackups();
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nella cancellazione del backup'));
    }
  };

  /** Il ripristino sovrascrive tutto: parte solo dopo una conferma esplicita con il nome del file scelto. */
  const confirmRestore = (file: File, type: 'database' | 'minio') => {
    const what = type === 'database' ? 'il database' : 'tutti i file (MinIO)';
    modal.confirm({
      // azioni pericolose: Invio non deve confermare
      autoFocusButton: 'cancel',
      title: `Ripristinare ${what}?`,
      content: (
        <div>
          <p>
            File scelto: <strong>{file.name}</strong> ({formatBytes(file.size)})
          </p>
          <p>
            I dati attuali vengono sostituiti da quelli del backup.
            {type === 'database'
              ? ' Prima del ripristino viene creato in automatico un backup di sicurezza del database attuale.'
              : ' Crea prima un backup dei file se non ne hai uno recente.'}
          </p>
        </div>
      ),
      okText: 'Ripristina',
      okButtonProps: { danger: true },
      cancelText: 'Annulla',
      onOk: () => handleRestoreBackup(file, type),
    });
  };

  const handleRestoreBackup = async (file: File, type: 'database' | 'minio') => {
    setRestoringBackup(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiService.post<{ safetyBackup?: string }>(`/settings/restore/${type}`, formData);
      message.success(`${type === 'database' ? 'Database' : 'File'} ripristinato con successo`);
      if (res?.safetyBackup) message.info(`Backup di sicurezza del database precedente: ${res.safetyBackup}`);
      message.warning('Ricaricare la pagina per vedere i cambiamenti');
      loadBackups();
    } catch (error: any) {
      message.error(getErrorMessage(error, 'Errore nel ripristino'));
    } finally {
      setRestoringBackup(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 byte';
    const k = 1024;
    const sizes = ['byte', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('Le password non coincidono');
      return;
    }

    setChangingPassword(true);
    try {
      await apiService.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      message.success('Password aggiornata con successo');
      passwordForm.resetFields();
    } catch (error: any) {
      message.error(getErrorMessage(error, 'Errore nel cambio password'));
    } finally {
      setChangingPassword(false);
    }
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
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <Form.Item name="host" label="Host SMTP" rules={[{ required: true }]}>
                  <Input placeholder="es. smtp.gmail.com" />
                </Form.Item>
                <Form.Item name="port" label="Porta" rules={[{ required: true }]}>
                  <InputNumber min={1} max={65535} placeholder="587" className="w-full" />
                </Form.Item>
              </div>
              <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                <Form.Item name="user" label="Username" rules={[{ required: true }]}>
                  <Input placeholder="es. noreply@example.com" />
                </Form.Item>
                <Form.Item
                  name="pass"
                  label="Password"
                  rules={[{ required: !smtpHasPassword, message: 'Inserisci la password SMTP' }]}
                  extra={smtpHasPassword ? 'Password salvata (cifrata). Lascia vuoto per non modificarla.' : undefined}
                >
                  <Input.Password
                    placeholder={smtpHasPassword ? '••••••••' : 'Password SMTP'}
                    autoComplete="new-password"
                  />
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

            <Divider className="my-4" />
            <div>
              <div className="font-medium mb-1">Invio di prova</div>
              <p className="mb-3 text-sm text-gray-600">
                Invia un'email di prova a un indirizzo qualsiasi usando i valori del modulo qui sopra (anche se non
                ancora salvati). Se il campo password è vuoto viene usata quella salvata.
              </p>
              <div className={`flex ${isMobile ? 'flex-col' : ''} gap-2`}>
                <Input
                  type="email"
                  placeholder="es. tuo.nome@gmail.com"
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  onPressEnter={handleSendTestEmail}
                  prefix={<MailOutlined />}
                  aria-label="Indirizzo per l'email di prova"
                  style={{ maxWidth: isMobile ? undefined : 360 }}
                />
                <Button icon={<SendOutlined />} loading={sendingTest} onClick={handleSendTestEmail}>
                  Invia email di prova
                </Button>
              </div>
              {testResult && (
                <Alert
                  className="mt-3"
                  type={testResult.ok ? 'success' : 'error'}
                  showIcon
                  message={testResult.text}
                  closable
                  onClose={() => setTestResult(null)}
                />
              )}
            </div>
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
              pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true, align: 'center' }}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button key="delete" danger onClick={() => handleDelete(item.key)}>
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
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-4`}>
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
              scroll={{ x: 640 }}
              pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
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
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
              <div>
                <h3 className="font-semibold mb-2">Ripristina Database</h3>
                <Upload
                  accept=".sql"
                  beforeUpload={(file) => {
                    confirmRestore(file, 'database');
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
                    confirmRestore(file, 'minio');
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
    {
      key: 'password',
      label: (
        <span>
          <LockOutlined />
          Cambio Password
        </span>
      ),
      children: (
        <Card title="Cambia Password">
          <Alert
            message="Sicurezza"
            description="La nuova password deve essere di almeno 8 caratteri. Dopo il cambio password dovrai effettuare nuovamente il login."
            type="info"
            showIcon
            className="mb-4"
          />
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
            className="max-w-md"
          >
            <Form.Item
              name="currentPassword"
              label="Password Attuale"
              rules={[{ required: true, message: 'Inserisci la password attuale' }]}
            >
              <Input.Password placeholder="Password attuale" />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="Nuova Password"
              rules={[
                { required: true, message: 'Inserisci la nuova password' },
                { min: 8, message: 'La password deve essere di almeno 8 caratteri' },
              ]}
            >
              <Input.Password placeholder="Nuova password" />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Conferma Nuova Password"
              rules={[
                { required: true, message: 'Conferma la nuova password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Le password non coincidono'));
                  },
                }),
              ]}
            >
              <Input.Password placeholder="Conferma nuova password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={changingPassword} icon={<LockOutlined />}>
                Cambia Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4">Impostazioni</h1>
      <Tabs
        items={tabItems}
        // l'elenco dei backup si carica quando si apre la scheda (prima restava vuoto fino a "Ricarica")
        onChange={(key) => key === 'backup' && authService.hasCapability('CAN_MANAGE_BACKUP') && loadBackups()}
        defaultActiveKey="email"
        tabPosition={isMobile ? 'top' : 'top'}
        size={isMobile ? 'small' : 'middle'}
      />
    </div>
  );
}
