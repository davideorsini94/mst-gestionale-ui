import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
} from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';

interface Capability {
  uuid: string;
  capability: string;
  roleCode: string;
}

interface Role {
  code: string;
  description?: string;
  capabilities?: Capability[];
}

export default function RolesPage() {
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiService.get<Role[]>('/roles');
      setRoles(data);
    } catch (error) {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: Partial<Role>) => {
    try {
      if (editingRole) {
        await apiService.put(`/roles/${editingRole.code}`, values);
        message.success('Ruolo aggiornato');
      } else {
        await apiService.post('/roles', values);
        message.success('Ruolo creato');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingRole(null);
      loadData();
    } catch (error) {
      message.error('Errore nel salvataggio');
    }
  };

  const handleDelete = async (code: string) => {
    try {
      await apiService.delete(`/roles/${code}`);
      message.success('Ruolo eliminato');
      loadData();
    } catch (error) {
      message.error('Errore nella cancellazione');
    }
  };

  const openModal = (role?: Role) => {
    setEditingRole(role || null);
    if (role) {
      form.setFieldsValue(role);
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const columns = [
    { title: 'Codice', dataIndex: 'code', key: 'code', width: 150 },
    { title: 'Descrizione', dataIndex: 'description', key: 'description' },
    {
      title: 'Capabilities',
      key: 'capabilities',
      width: 150,
      render: (_: unknown, record: Role) => (
        <span>{record.capabilities?.length || 0} assegnate</span>
      ),
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Role) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/roles/${record.code}`)}
            title="Gestisci capabilities"
          >
            Dettagli
          </Button>
          <Popconfirm title="Eliminare?" onConfirm={() => handleDelete(record.code)}>
            <Button icon={<DeleteOutlined />} danger title="Elimina" aria-label="Elimina ruolo" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Ruoli</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nuovo Ruolo
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="code"
        loading={loading}
        scroll={{ x: 600 }}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
      />

      <Modal
        title={editingRole ? 'Modifica Ruolo' : 'Nuovo Ruolo'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="code" label="Codice" rules={[{ required: true }]}>
            <Input disabled={!!editingRole} placeholder="es. admin, staff, user" />
          </Form.Item>
          <Form.Item name="description" label="Descrizione">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
