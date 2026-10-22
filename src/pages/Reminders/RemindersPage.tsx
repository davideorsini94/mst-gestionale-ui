import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Space, Tabs, Tooltip, Card, Statistic, Row, Col, Grid, theme } from 'antd';
import { message } from '../../services/notify';
import { ReloadOutlined, SendOutlined, ClockCircleOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import { getErrorMessage } from '../../helpers/errors';
import { useLatestRequest } from '../../hooks/useLatestRequest';

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

// stessi tipi delle email (backend: reminders/email.service.ts), senza il prefisso "Scadenza" ripetuto in ogni riga
const typeLabels: Record<string, string> = {
  VEHICLE_TAX: 'Bollo Veicolo',
  VEHICLE_INSPECTION: 'Tagliando/Revisione',
  VEHICLE_INSURANCE: 'Assicurazione Veicolo',
  MEDICAL_CERTIFICATE: 'Certificato Medico',
  DRIVING_LICENSE: 'Patente',
  SKI_INSTRUCTOR_LICENSE: 'Licenza Maestro di Sci',
  COACH_LICENSE: 'Licenza Allenatore',
  MEMBER_MEDICAL_CERTIFICATE: 'Visita Medica Tesserato',
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

type ReminderStatus = Reminder['status'];
type TabKey = 'all' | 'scheduled' | 'sent' | 'failed';

interface ReminderCounts {
  all: number;
  SCHEDULED: number;
  SENT: number;
  FAILED: number;
  CANCELLED: number;
}

const tabStatus: Record<TabKey, ReminderStatus | null> = {
  all: null,
  scheduled: 'SCHEDULED',
  sent: 'SENT',
  failed: 'FAILED',
};

const { useBreakpoint } = Grid;

export default function RemindersPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [counts, setCounts] = useState<ReminderCounts | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [checkingNow, setCheckingNow] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const beginRequest = useLatestRequest();

  // Paginazione lato server: GET /reminders?filters={page,pageSize,andFilters.equal.status}
  const loadReminders = useCallback(async (tab: TabKey, page: number, pageSize: number) => {
    // cambiando tab in fretta, la risposta di un tab precedente non deve sovrascrivere quella attuale
    const isCurrent = beginRequest();
    setLoading(true);
    try {
      const filters: Record<string, unknown> = { page, pageSize };
      const status = tabStatus[tab];
      if (status) {
        filters.andFilters = { equal: { status } };
      }
      const [data, total] = await apiService.get<[Reminder[], number]>(
        `/reminders?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      if (!isCurrent()) return;
      setReminders(data);
      setPagination({ current: page, pageSize, total });
    } catch (error) {
      if (isCurrent()) message.error('Errore nel caricamento dei reminder');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [beginRequest]);

  // Contatori dei tab: GET /reminders/counts
  const loadCounts = useCallback(async () => {
    try {
      const data = await apiService.get<ReminderCounts>('/reminders/counts');
      setCounts(data);
    } catch (error) {
      console.error('Errore nel caricamento dei contatori reminder:', error);
    }
  }, []);

  useEffect(() => {
    loadReminders('all', 1, 20);
    loadCounts();
  }, [loadReminders, loadCounts]);

  const refresh = () => {
    loadReminders(activeTab, pagination.current, pagination.pageSize);
    loadCounts();
  };

  const handleTabChange = (key: string) => {
    const tab = key as TabKey;
    setActiveTab(tab);
    loadReminders(tab, 1, pagination.pageSize);
  };

  const handleCheckNow = async () => {
    setCheckingNow(true);
    try {
      await apiService.post('/reminders/check-now');
      message.success('Controllo reminder completato');
      refresh();
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore durante il controllo'));
    } finally {
      setCheckingNow(false);
    }
  };

  const handleResend = async (uuid: string) => {
    setResending(uuid);
    try {
      await apiService.post(`/reminders/${uuid}/resend`);
      message.success('Reminder reinviato');
      refresh();
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel reinvio'));
    } finally {
      setResending(null);
    }
  };

  const countLabel = (value: number | undefined) => (value === undefined ? '' : ` (${value})`);

  const columns = [
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      width: isMobile ? 140 : 180,
      render: (type: string) => typeLabels[type] || type,
    },
    {
      title: 'Descrizione',
      dataIndex: 'subjectDescription',
      key: 'subjectDescription',
      // su mobile la colonna troncata mostrava solo poche lettere: il testo va a capo
      ellipsis: !isMobile,
      width: isMobile ? 200 : undefined,
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
                aria-label="Reinvia ora"
              />
            </Tooltip>
          )}
          {record.status === 'FAILED' && record.errorMessage && (
            <Tooltip title={record.errorMessage}>
              <ExclamationCircleOutlined style={{ color: token.colorError }} aria-label="Dettaglio errore" />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: `Tutti${countLabel(counts?.all)}`,
    },
    {
      key: 'scheduled',
      label: (
        <span>
          <ClockCircleOutlined /> Programmati{countLabel(counts?.SCHEDULED)}
        </span>
      ),
    },
    {
      key: 'sent',
      label: (
        <span>
          <CheckCircleOutlined /> Inviati{countLabel(counts?.SENT)}
        </span>
      ),
    },
    {
      key: 'failed',
      label: (
        <span>
          <ExclamationCircleOutlined /> Falliti{countLabel(counts?.FAILED)}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-4`}>
        <h1 className="text-2xl font-bold" style={{ margin: 0 }}>Gestione Reminder Scadenze</h1>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={refresh} loading={loading}>
            Aggiorna
          </Button>
          <Button type="primary" icon={<ClockCircleOutlined />} onClick={handleCheckNow} loading={checkingNow}>
            Esegui Controllo Ora
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Totale Reminder"
              value={counts?.all ?? '-'}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Programmati"
              value={counts?.SCHEDULED ?? '-'}
              valueStyle={{ color: token.colorPrimary }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Inviati"
              value={counts?.SENT ?? '-'}
              valueStyle={{ color: token.colorSuccessText }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card>
            <Statistic
              title="Falliti"
              value={counts?.FAILED ?? '-'}
              valueStyle={{ color: token.colorErrorText }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Tabs items={tabItems} activeKey={activeTab} onChange={handleTabChange} />
      <Table
        columns={columns}
        dataSource={reminders}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: 900 }}
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
        onChange={(pag) => loadReminders(activeTab, pag.current || 1, pag.pageSize || pagination.pageSize)}
      />
    </div>
  );
}
