import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';

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
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();

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

  const columns = [
    { title: 'Username', dataIndex: 'username', key: 'username' },
    {
      title: 'Nome',
      key: 'fullName',
      render: (_: unknown, record: User) =>
        [record.firstName, record.lastName].filter(Boolean).join(' ') || '-',
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
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
      width: 120,
      render: (_: unknown, record: User) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} title="Modifica" />
          <Popconfirm title="Eliminare questo utente?" onConfirm={() => handleDelete(record.uuid)}>
            <Button icon={<DeleteOutlined />} danger title="Elimina" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Utenti</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nuovo Utente
        </Button>
      </div>

      <Table columns={columns} dataSource={users} rowKey="uuid" loading={loading} />

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
    </div>
  );
}
