import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, message, Input, Select, Tooltip } from 'antd';
import { PlusOutlined, EyeOutlined, SearchOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import HotelBookingModal from './HotelBookingModal';
import dayjs from 'dayjs';

interface Member {
  uuid: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  memberType: string;
  status: string;
  isCompetitor: boolean;
  fisiCode?: string;
  fisCode?: string;
  gender?: string;
  medicalExamExpiry?: string;
}

const statusColors: Record<string, string> = {
  ACTIVE: 'green',
  INACTIVE: 'red',
  SUSPENDED: 'orange',
};

const memberTypeLabels: Record<string, string> = {
  ATHLETE: 'Atleta',
  PARENT: 'Genitore',
  MEMBER: 'Tesserato',
};

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [filterCompetitor, setFilterCompetitor] = useState<boolean | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData(1, 10);
  }, [filterType, filterCompetitor]);

  const loadData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        pageSize,
      };

      const andFilters: any = {};
      if (filterType) {
        andFilters.equal = { ...andFilters.equal, memberType: filterType };
      }
      if (filterCompetitor !== null) {
        andFilters.equal = { ...andFilters.equal, isCompetitor: filterCompetitor };
      }
      if (Object.keys(andFilters).length > 0) {
        filters.andFilters = andFilters;
      }

      if (search) {
        filters.orFilters = {
          like: {
            firstName: search,
            lastName: search,
            email: search,
            fisiCode: search,
            fisCode: search,
          },
        };
      }

      const response = await apiService.get<[Member[], number]>(
        `/members?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      setMembers(response[0]);
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
    loadData(pag.current, pag.pageSize);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    loadData(1, pagination.pageSize);
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

  const columns = [
    {
      title: 'Nome',
      key: 'name',
      render: (_: unknown, record: Member) => `${record.lastName} ${record.firstName}`,
      sorter: (a: Member, b: Member) => a.lastName.localeCompare(b.lastName),
    },
    {
      title: '',
      key: 'warning',
      width: 40,
      render: (_: unknown, record: Member) => {
        const expired = isExpired(record.medicalExamExpiry);
        const expiring = isExpiringSoon(record.medicalExamExpiry);
        
        if (expired) {
          return (
            <Tooltip title={`Visita medica scaduta il ${dayjs(record.medicalExamExpiry).format('DD/MM/YYYY')}`}>
              <WarningOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
            </Tooltip>
          );
        }
        if (expiring) {
          return (
            <Tooltip title={`Visita medica in scadenza il ${dayjs(record.medicalExamExpiry).format('DD/MM/YYYY')}`}>
              <WarningOutlined style={{ color: '#faad14', fontSize: 16 }} />
            </Tooltip>
          );
        }
        return null;
      },
    },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Telefono', dataIndex: 'phone', key: 'phone' },
    {
      title: 'Tipo',
      dataIndex: 'memberType',
      key: 'memberType',
      render: (type: string) => memberTypeLabels[type] || type,
    },
    {
      title: 'Agonista',
      dataIndex: 'isCompetitor',
      key: 'isCompetitor',
      render: (isCompetitor: boolean) => (
        <Tag color={isCompetitor ? 'blue' : 'default'}>
          {isCompetitor ? 'Sì' : 'No'}
        </Tag>
      ),
    },
    { title: 'Codice FISI', dataIndex: 'fisiCode', key: 'fisiCode' },
    { title: 'Codice FIS', dataIndex: 'fisCode', key: 'fisCode' },
    {
      title: 'Stato',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{status}</Tag>,
    },
    {
      title: 'Azioni',
      key: 'actions',
      render: (_: unknown, record: Member) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/members/${record.uuid}`)}
          >
            Dettagli
          </Button>
        </Space>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
    getCheckboxProps: (record: Member) => ({
      disabled: !record.isCompetitor,
      name: record.uuid,
    }),
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tesserati</h1>
        <Space>
          <Input.Search
            placeholder="Cerca..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            allowClear
            style={{ width: 200 }}
          />
          <Select
            placeholder="Tipo"
            allowClear
            style={{ width: 120 }}
            onChange={(value) => setFilterType(value)}
          >
            <Select.Option value="ATHLETE">Atleta</Select.Option>
            <Select.Option value="PARENT">Genitore</Select.Option>
            <Select.Option value="MEMBER">Tesserato</Select.Option>
          </Select>
          <Select
            placeholder="Agonista"
            allowClear
            style={{ width: 120 }}
            onChange={(value) =>
              setFilterCompetitor(value === undefined ? null : value)
            }
          >
            <Select.Option value={true}>Sì</Select.Option>
            <Select.Option value={false}>No</Select.Option>
          </Select>
          <Button
            icon={<FileTextOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setHotelModalOpen(true)}
          >
            Lista Alberghiera ({selectedRowKeys.length})
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/members/new')}
          >
            Nuovo Tesserato
          </Button>
        </Space>
      </div>

      <div className="mb-2 text-gray-500">
        Seleziona gli atleti agonisti per generare la lista prenotazione alberghiera
      </div>

      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={members}
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

      <HotelBookingModal
        open={hotelModalOpen}
        onClose={() => setHotelModalOpen(false)}
        memberUuids={selectedRowKeys}
      />
    </div>
  );
}
