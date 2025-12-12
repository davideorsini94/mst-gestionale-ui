import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Divider, List } from 'antd';
import { apiService } from '../../services/ApiService';

interface Setting {
  key: string;
  value: unknown;
  description?: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await apiService.get<Setting[]>('/settings');
      setSettings(data);
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

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Impostazioni</h1>

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

      <Divider />

      <Card title="Impostazioni Correnti" loading={loading}>
        <List
          dataSource={settings}
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
  );
}
