import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Tooltip, Grid, theme, type TableProps } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EyeOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import SearchBox from '../../components/SearchBox';
import { useCapability } from '../../hooks/useAuth';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import dayjs from 'dayjs';
import { LoadErrorEmpty } from '../../components/StatusPages';

const { useBreakpoint } = Grid;

interface Staff {
  uuid: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  staffRole: string;
  status: string;
  medicalExamExpiry?: string;
  drivingLicenseExpiry?: string;
  skiInstructorLicenseExpiry?: string;
  firstAidCertificateExpiry?: string;
  coachLicenseExpiry?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
  ON_LEAVE: 'orange',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  ON_LEAVE: 'In congedo',
};

const roleLabels: Record<string, string> = {
  INSTRUCTOR: 'Istruttore',
  DRIVER: 'Autista',
  ADMIN: 'Amministrativo',
  VOLUNTEER: 'Volontario',
  OTHER: 'Altro',
};

interface Query {
  page: number;
  pageSize: number;
  /** ricerca confermata (Invio/Cerca), non il testo che si sta scrivendo */
  search: string;
}

export default function StaffPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const canManageStaff = useCapability('CAN_MANAGE_STAFF');
  const [staff, setStaff] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState<Query>({ page: 1, pageSize: 10, search: '' });
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const beginRequest = useLatestRequest();

  useEffect(() => {
    const isCurrent = beginRequest();
    const load = async () => {
      setLoading(true);
      try {
        const filters: Record<string, unknown> = { page: query.page, pageSize: query.pageSize };
        if (query.search) {
          filters.orFilters = {
            like: {
              firstName: query.search,
              lastName: query.search,
              email: query.search,
            },
          };
        }
        const response = await apiService.get<[Staff[], number]>(
          `/staff?filters=${encodeURIComponent(JSON.stringify(filters))}`
        );
        if (!isCurrent()) return;
        setLoadError(false);
        setStaff(response[0]);
        setTotal(response[1]);
      } catch (error) {
        if (isCurrent()) {
          setLoadError(true);
          message.error('Errore nel caricamento dello staff');
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    load();
  }, [query, beginRequest]);

  const handleTableChange: TableProps<Staff>['onChange'] = (pag) => {
    setQuery((q) => ({ ...q, page: pag.current ?? 1, pageSize: pag.pageSize ?? q.pageSize }));
  };

  // Funzione per verificare se una data scade entro N giorni
  const isExpiringSoon = (date: string | undefined, daysAhead: number = 30): boolean => {
    if (!date) return false;
    const expiry = dayjs(date);
    const today = dayjs().startOf('day');
    const futureDate = today.add(daysAhead, 'day');
    return expiry.isAfter(today) && expiry.isBefore(futureDate);
  };

  const isExpired = (date: string | undefined): boolean => {
    if (!date) return false;
    return dayjs(date).isBefore(dayjs().startOf('day'));
  };

  // Verifica tutte le scadenze dello staff
  const getExpiryWarnings = (record: Staff): { expired: string[]; expiring: string[] } => {
    const expiryFields = [
      { field: 'medicalExamExpiry', label: 'Visita medica' },
      { field: 'drivingLicenseExpiry', label: 'Patente' },
      { field: 'skiInstructorLicenseExpiry', label: 'Patentino istruttore' },
      { field: 'firstAidCertificateExpiry', label: 'Primo soccorso' },
      { field: 'coachLicenseExpiry', label: 'Patente allenatore' },
    ];

    const expired: string[] = [];
    const expiring: string[] = [];

    expiryFields.forEach(({ field, label }) => {
      const value = record[field as keyof Staff] as string | undefined;
      if (isExpired(value)) {
        expired.push(`${label} scaduta il ${dayjs(value).format('DD/MM/YYYY')}`);
      } else if (isExpiringSoon(value)) {
        expiring.push(`${label} in scadenza il ${dayjs(value).format('DD/MM/YYYY')}`);
      }
    });

    return { expired, expiring };
  };

  const columns = [
    {
      title: 'Nome',
      key: 'name',
      render: (_: unknown, record: Staff) => `${record.firstName} ${record.lastName}`,
    },
    {
      title: '',
      key: 'warning',
      width: 40,
      render: (_: unknown, record: Staff) => {
        const { expired, expiring } = getExpiryWarnings(record);
        
        if (expired.length > 0) {
          return (
            <Tooltip title={expired.join('\n')}>
              <WarningOutlined style={{ color: token.colorError, fontSize: 16 }} aria-label="Scadenze superate" />
            </Tooltip>
          );
        }
        if (expiring.length > 0) {
          return (
            <Tooltip title={expiring.join('\n')}>
              <WarningOutlined style={{ color: token.colorWarning, fontSize: 16 }} aria-label="Scadenze imminenti" />
            </Tooltip>
          );
        }
        return null;
      },
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Telefono', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Ruolo',
      dataIndex: 'staffRole',
      key: 'staffRole',
      render: (role: string) => roleLabels[role] || role,
    },
    {
      title: 'Stato',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>
      ),
    },
    {
      title: 'Azioni',
      key: 'actions',
      render: (_: unknown, record: Staff) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/staff/${record.uuid}`)}
          >
            Dettagli
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center gap-3'} mb-4`}>
        <h1 className="text-2xl font-bold" style={{ margin: 0 }}>Staff</h1>
        <div className={`flex flex-wrap gap-2 ${isMobile ? '' : 'justify-end items-center'}`}>
          <SearchBox
            value={searchText}
            onChange={setSearchText}
            onSearch={(value) => setQuery((q) => ({ ...q, search: value, page: 1 }))}
            placeholder="Cerca nello staff…"
            ariaLabel="Cerca nello staff"
            width={isMobile ? '100%' : 240}
          />
          {canManageStaff && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/staff/new')}
            >
              Nuovo Membro
            </Button>
          )}
        </div>
      </div>

      <Table<Staff>
        columns={columns}
        dataSource={staff}
        locale={loadError ? { emptyText: <LoadErrorEmpty onRetry={() => setQuery((q) => ({ ...q }))} /> } : undefined}
        scroll={{ x: 'max-content' }}
        rowKey="uuid"
        loading={loading}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: !isMobile,
          showTotal: isMobile ? undefined : (t, range) => `${range[0]}-${range[1]} di ${t}`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
      />
    </div>
  );
}
