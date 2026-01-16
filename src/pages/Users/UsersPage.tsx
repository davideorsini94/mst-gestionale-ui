import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag, Switch, Divider, Alert, Grid } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { authService } from '../../services/AuthService';

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
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm] = Form.useForm();
  const [changingPassword, setChangingPassword] = useState(false);

  const currentUser = authService.getUser();
  const canViewUsers = authService.hasCapability('CAN_VIEW_USERS');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        apiService.get<[User[], number]>('/users'),
        apiService.get<Role[]>('/roles'),
      ]);
      setUsers(usersRes[0]);
      setRoles(rolesRes);
    } catch (error) {
      message.error('Errore nel caricamento dati');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: Partial<User> & { password?: string }) => {
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
      message.error('Errore nel salvataggio');
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await apiService.delete(`/users/${uuid}`);
      message.success('Utente eliminato');
      loadData();
    } catch (error) {
      message.error('Errore nella cancellazione');
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
      const errorMessage = error?.response?.data?.message || 'Errore nel cambio password';
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
      width: isMobile ? 100 : (canViewUsers ? 180 : 120),
      render: (_: unknown, record: User) => {
        const canEdit = canViewUsers || record.uuid === currentUser?.uuid;
        const canChangePassword = record.uuid === currentUser?.uuid;
        const canDelete = canViewUsers && record.uuid !== currentUser?.uuid;

        return (
          <Space size="small">
            {canEdit && (
              <Button size={isMobile ? 'small' : 'middle'} icon={<EditOutlined />} onClick={() => openModal(record)} title="Modifica" />
            )}
            {canChangePassword && (
              <Button size={isMobile ? 'small' : 'middle'} icon={<LockOutlined />} onClick={() => openPasswordModal(record)} title="Cambia Password" />
            )}
            {canDelete && (
              <Popconfirm title="Eliminare questo utente?" onConfirm={() => handleDelete(record.uuid)}>
                <Button size={isMobile ? 'small' : 'middle'} icon={<DeleteOutlined />} danger title="Elimina" />
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
        {canViewUsers && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()} block={isMobile}>
            {isMobile ? 'Nuovo' : 'Nuovo Utente'}
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: isMobile ? 400 : undefined }}
        size={isMobile ? 'small' : 'middle'}
      />

      <Modal
        title={editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
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
              rules={[{ required: true, message: 'Inserisci password' }]}
            >
              <Input.Password placeholder="Minimo 6 caratteri" />
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
              { min: 6, message: 'La password deve avere almeno 6 caratteri' },
            ]}
          >
            <Input.Password placeholder="Minimo 6 caratteri" />
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
