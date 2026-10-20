import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Input, Tooltip, theme } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EyeOutlined, SearchOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import dayjs from 'dayjs';

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

const roleLabels: Record<string, string> = {
  INSTRUCTOR: 'Istruttore',
  DRIVER: 'Autista',
  ADMIN: 'Amministrativo',
  VOLUNTEER: 'Volontario',
  OTHER: 'Altro',
};

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const navigate = useNavigate();
  const { token } = theme.useToken();

  useEffect(() => {
    loadData(1, 10, search);
  }, []);

  const loadData = async (page: number, pageSize: number, searchText: string) => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        pageSize,
      };

      if (searchText) {
        filters.orFilters = {
          like: {
            firstName: searchText,
            lastName: searchText,
            email: searchText,
          },
        };
      }

      const response = await apiService.get<[Staff[], number]>(
        `/staff?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      setStaff(response[0]);
      setPagination({
        current: page,
        pageSize,
        total: response[1],
      });
    } catch (error) {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (pag: any) => {
    loadData(pag.current, pag.pageSize, search);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    loadData(1, pagination.pageSize, value);
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
        <Tag color={statusColors[status]}>{status}</Tag>
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Staff</h1>
        <Space>
          <Input.Search
            enterButton={<Button icon={<SearchOutlined />} aria-label="Cerca" />}
            placeholder="Cerca..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/staff/new')}
          >
            Nuovo Membro
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={staff}
        rowKey="uuid"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} di ${total}`,
          pageSizeOptions: ['10', '20', '50', '100'],
        }}
        onChange={handleTableChange}
      />
    </div>
  );
}
