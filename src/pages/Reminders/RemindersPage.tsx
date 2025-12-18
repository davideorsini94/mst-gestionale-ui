import { useState, useEffect } from 'react';
import { Table, Button, Tag, message, Space, Tabs, Popconfirm, Tooltip, Card, Statistic, Row, Col } from 'antd';
import { ReloadOutlined, SendOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';

interface Reminder {
  uuid: string;
  type: string;
  status: 'SCHEDULED' | 'SENT' | 'FAILED' | 'CANCELLED';
  expiryDate: string;
  scheduledSendDate: string;
  sentAt?: string;
  recipientEmail?: string;
  recipientName?: string;
  subjectDescription?: string;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
}

const typeLabels: Record<string, string> = {
  VEHICLE_TAX: 'Bollo Veicolo',
  VEHICLE_INSPECTION: 'Tagliando/Revisione',
  VEHICLE_INSURANCE: 'Assicurazione Veicolo',
  MEDICAL_CERTIFICATE: 'Certificato Medico',
  DRIVING_LICENSE: 'Patente',
  SKI_INSTRUCTOR_LICENSE: 'Licenza Maestro Sci',
  COACH_LICENSE: 'Licenza Allenatore',
};

const statusColors: Record<string, string> = {
  SCHEDULED: 'blue',
  SENT: 'green',
  FAILED: 'red',
  CANCELLED: 'gray',
};

const statusLabels: Record<string, string> = {
  SCHEDULED: 'Programmato',
  SENT: 'Inviato',
  FAILED: 'Fallito',
  CANCELLED: 'Annullato',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingNow, setCheckingNow] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    setLoading(true);
    try {
      const [data] = await apiService.get<[Reminder[], number]>('/reminders');
      setReminders(data);
    } catch (error) {
      message.error('Errore nel caricamento dei reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setCheckingNow(true);
    try {
      await apiService.post('/reminders/check-now');
      message.success('Controllo reminder completato');
      loadReminders();
    } catch (error) {
      message.error('Errore durante il controllo');
    } finally {
      setCheckingNow(false);
    }
  };

  const handleResend = async (uuid: string) => {
    setResending(uuid);
    try {
      await apiService.post(`/reminders/${uuid}/resend`);
      message.success('Reminder reinviato');
      loadReminders();
    } catch (error) {
      message.error('Errore nel reinvio');
    } finally {
      setResending(null);
    }
  };

  const scheduledReminders = reminders.filter(r => r.status === 'SCHEDULED');
  const sentReminders = reminders.filter(r => r.status === 'SENT');
  const failedReminders = reminders.filter(r => r.status === 'FAILED');

  const columns = [
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: 180,
      render: (type: string) => typeLabels[type] || type,
    },
    {
      title: 'Descrizione',
      dataIndex: 'subjectDescription',
      key: 'subjectDescription',
      ellipsis: true,
    },
    {
      title: 'Destinatario',
      key: 'recipient',
      width: 200,
      render: (_: unknown, record: Reminder) => (
        <div>
          <div>{record.recipientName}</div>
          <div className="text-xs text-gray-500">{record.recipientEmail}</div>
        </div>
      ),
    },
    {
      title: 'Scadenza',
      dataIndex: 'expiryDate',
      key: 'expiryDate',
      width: 120,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Stato',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: 'Inviato',
      dataIndex: 'sentAt',
      key: 'sentAt',
      width: 150,
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Reminder) => (
        <Space>
          {(record.status === 'SCHEDULED' || record.status === 'FAILED') && (
            <Tooltip title="Reinvia ora">
              <Button
                icon={<SendOutlined />}
                size="small"
                loading={resending === record.uuid}
                onClick={() => handleResend(record.uuid)}
              />
            </Tooltip>
          )}
          {record.status === 'FAILED' && record.errorMessage && (
            <Tooltip title={record.errorMessage}>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: `Tutti (${reminders.length})`,
      children: (
        <Table
          columns={columns}
          dataSource={reminders}
          rowKey="uuid"
          loading={loading}
          pagination={{ pageSize: 20, showSizeChanger: true }}
        />
      ),
    },
    {
      key: 'scheduled',
      label: (
        <span>
          <ClockCircleOutlined /> Programmati ({scheduledReminders.length})
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={scheduledReminders}
          rowKey="uuid"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      ),
    },
    {
      key: 'sent',
      label: (
        <span>
          <CheckCircleOutlined /> Inviati ({sentReminders.length})
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={sentReminders}
          rowKey="uuid"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      ),
    },
    {
      key: 'failed',
      label: (
        <span>
          <ExclamationCircleOutlined /> Falliti ({failedReminders.length})
        </span>
      ),
      children: (
        <Table
          columns={columns}
          dataSource={failedReminders}
          rowKey="uuid"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Gestione Reminder Scadenze</h1>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadReminders} loading={loading}>
            Aggiorna
          </Button>
          <Button type="primary" icon={<ClockCircleOutlined />} onClick={handleCheckNow} loading={checkingNow}>
            Esegui Controllo Ora
          </Button>
        </Space>
      </div>

      <Row gutter={16} className="mb-4">
        <Col span={6}>
          <Card>
            <Statistic
              title="Totale Reminder"
              value={reminders.length}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Programmati"
              value={scheduledReminders.length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Inviati"
              value={sentReminders.length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Falliti"
              value={failedReminders.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs items={tabItems} defaultActiveKey="all" />
    </div>
  );
}
