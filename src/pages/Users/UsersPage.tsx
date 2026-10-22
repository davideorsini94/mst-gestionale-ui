import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Tag, Switch, Divider, Alert, Grid } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { useCapability, useCurrentUser } from '../../hooks/useAuth';
import { emptyToNull, getErrorMessage } from '../../helpers/errors';
import { LoadErrorEmpty } from '../../components/StatusPages';

const { useBreakpoint } = Grid;

interface User {
  uuid: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  roleCode?: string;
  role?: Role;
  isActive: boolean;
}

interface Role {
  code: string;
  description?: string;
}

export default function UsersPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [users, setUsers] = useState<User[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const currentUser = useCurrentUser();
  // vedere la pagina richiede CAN_VIEW_USERS (rotta protetta); creare, modificare ed eliminare CAN_MANAGE_USERS
  const canManageUsers = useCapability('CAN_MANAGE_USERS');

  useEffect(() => {
    loadUsers(1, 10);
    loadRoles();
  }, []);

  // Paginazione lato server: GET /users?filters={"page":..,"pageSize":..} → [User[], total]
  const loadUsers = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const filters = { page, pageSize };
      const [data, total] = await apiService.get<[User[], number]>(
        `/users?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      // se la pagina corrente si è svuotata (es. dopo una cancellazione) torna indietro
      if (data.length === 0 && total > 0 && page > 1) {
        loadUsers(Math.max(1, Math.ceil(total / pageSize)), pageSize);
        return;
      }
      setLoadError(false);
      setUsers(data);
      setPagination({ current: page, pageSize, total });
    } catch (error) {
      setLoadError(true);
      message.error('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  // Ruoli per il selettore (lista completa, invariato)
  const loadRoles = async () => {
    try {
      const rolesRes = await apiService.get<Role[]>('/roles');
      setRoles(rolesRes);
    } catch (error) {
      message.error('Errore nel caricamento dati');
    }
  };

  const loadData = () => loadUsers(pagination.current, pagination.pageSize);

  const handleSave = async (formValues: Partial<User> & { password?: string }) => {
    // email vuota → null (una stringa vuota non è un'email valida per il backend)
    const values = { ...formValues, email: emptyToNull(formValues.email) };
    try {
      if (editingUser) {
        await apiService.put(`/users/${editingUser.uuid}`, values);
        message.success('Utente aggiornato');
      } else {
        await apiService.post('/users', values);
        message.success('Utente creato');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingUser(null);
      loadData();
    } catch (error) {
      message.error(getErrorMessage(error, "Errore nel salvataggio dell'utente"));
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await apiService.delete(`/users/${uuid}`);
      message.success('Utente eliminato');
      loadData();
    } catch (error) {
      message.error(getErrorMessage(error, "Errore nell'eliminazione dell'utente"));
    }
  };

  const openModal = (user?: User) => {
    setEditingUser(user || null);
    if (user) {
      form.setFieldsValue(user);
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const openPasswordModal = (user: User) => {
    setEditingUser(user);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setChangingPassword(true);
    try {
      await apiService.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      message.success('Password aggiornata con successo');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
      setEditingUser(null);
    } catch (error: any) {
      const errorMessage = getErrorMessage(error, 'Errore nel cambio password');
      message.error(errorMessage);
    } finally {
      setChangingPassword(false);
    }
  };

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    ...(!isMobile ? [{
      title: 'Nome',
      key: 'fullName',
      render: (_: unknown, record: User) =>
        [record.firstName, record.lastName].filter(Boolean).join(' ') || '-',
    }] : []),
    ...(!isMobile ? [{ title: 'Email', dataIndex: 'email', key: 'email' }] : []),
    {
      title: 'Ruolo',
      dataIndex: 'roleCode',
      key: 'roleCode',
      render: (roleCode: string) => roleCode || '-',
    },
    {
      title: 'Attivo',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Sì' : 'No'}</Tag>
      ),
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: isMobile ? 100 : (canManageUsers ? 180 : 120),
      render: (_: unknown, record: User) => {
        const canEdit = canManageUsers;
        const canChangePassword = record.uuid === currentUser?.uuid;
        const canDelete = canManageUsers && record.uuid !== currentUser?.uuid;

        return (
          <Space size="small">
            {canEdit && (
              <Button size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => openModal(record)} title="Modifica" aria-label="Modifica utente" />
            )}
            {canChangePassword && (
              <Button size={isMobile ? 'small' : 'middle'} icon={<LockOutlined />} onClick={() => openPasswordModal(record)} title="Cambia Password" aria-label="Cambia password" />
            )}
            {canDelete && (
              <Popconfirm title="Eliminare questo utente?" onConfirm={() => handleDelete(record.uuid)}>
                <Button size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />} danger title="Elimina" aria-label="Elimina utente" />
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'justify-between items-center'} mb-4`}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 'bold', margin: 0 }}>Utenti</h1>
        {canManageUsers && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} block={isMobile}>
            {isMobile ? 'Nuovo' : 'Nuovo Utente'}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={users}
        locale={loadError ? { emptyText: <LoadErrorEmpty onRetry={loadData} /> } : undefined}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: isMobile ? 400 : undefined }}
        size={isMobile ? 'small' : 'middle'}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: !isMobile,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} di ${total}`,
          simple: isMobile,
        }}
        onChange={(pag) => loadUsers(pag.current || 1, pag.pageSize || pagination.pageSize)}
      />

      <Modal
        title={editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Salva"
        cancelText="Annulla"
        // il form esiste anche a modale chiusa: openModal() lo riempie prima di aprirla
        forceRender
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Inserisci username' }]}
          >
            <Input placeholder="es. mario.rossi" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="Password"
              rules={[
                { required: true, message: 'Inserisci password' },
                // stessa regola del backend (minimo 8 caratteri)
                { min: 8, message: 'La password deve avere almeno 8 caratteri' },
              ]}
            >
              <Input.Password placeholder="Minimo 8 caratteri" />
            </Form.Item>
          )}
          <Form.Item name="firstName" label="Nome">
            <Input placeholder="Mario" />
          </Form.Item>
          <Form.Item name="lastName" label="Cognome">
            <Input placeholder="Rossi" />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" placeholder="mario.rossi@email.com" />
          </Form.Item>
          <Form.Item
            name="roleCode"
            label="Ruolo"
            rules={[{ required: true, message: 'Seleziona un ruolo' }]}
          >
            <Select placeholder="Seleziona ruolo">
              {roles.map((role: Role) => (
                <Select.Option key={role.code} value={role.code}>
                  {role.code}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isActive" label="Attivo" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Cambia Password - ${editingUser?.username || ''}`}
        open={passwordModalOpen}
        onCancel={() => {
          setPasswordModalOpen(false);
          passwordForm.resetFields();
          setEditingUser(null);
        }}
        onOk={() => passwordForm.submit()}
        confirmLoading={changingPassword}
        okText="Cambia Password"
        cancelText="Annulla"
        forceRender
      >
        <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
          <Form.Item
            name="currentPassword"
            label="Password Attuale"
            rules={[
              { required: true, message: 'Inserisci la password attuale' },
            ]}
          >
            <Input.Password placeholder="Password attuale" />
          </Form.Item>
          <Form.Item
            name="newPassword"
            label="Nuova Password"
            rules={[
              { required: true, message: 'Inserisci la nuova password' },
              { min: 8, message: 'La password deve avere almeno 8 caratteri' },
            ]}
          >
            <Input.Password placeholder="Minimo 8 caratteri" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="Conferma Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Conferma la password' },
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
            <Input.Password placeholder="Ripeti la password" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
