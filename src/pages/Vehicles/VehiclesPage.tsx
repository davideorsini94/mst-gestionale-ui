import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Grid, type TableProps } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import SearchBox from '../../components/SearchBox';
import { useCapability } from '../../hooks/useAuth';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { LoadErrorEmpty } from '../../components/StatusPages';

const { useBreakpoint } = Grid;

interface Vehicle {
  uuid: string;
  name: string;
  type: string;
  brand?: string;
  model?: string;
  licensePlate: string;
  seats?: number;
  status: string;
}

const statusColors: Record<string, string> = {
  AVAILABLE: 'green',
  IN_USE: 'blue',
  MAINTENANCE: 'orange',
  OUT_OF_SERVICE: 'red',
};

const statusLabels: Record<string, string> = {
  AVAILABLE: 'Disponibile',
  IN_USE: 'In uso',
  MAINTENANCE: 'Manutenzione',
  OUT_OF_SERVICE: 'Fuori servizio',
};

const typeLabels: Record<string, string> = {
  MINIBUS: 'Pulmino',
  BUS: 'Bus',
  VAN: 'Furgone',
  CAR: 'Auto',
  OTHER: 'Altro',
};

interface Query {
  page: number;
  pageSize: number;
  /** ricerca confermata (Invio/Cerca), non il testo che si sta scrivendo */
  search: string;
}

export default function VehiclesPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const canManageVehicles = useCapability('CAN_MANAGE_VEHICLES');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState<Query>({ page: 1, pageSize: 10, search: '' });
  const navigate = useNavigate();
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
              name: query.search,
              licensePlate: query.search,
              brand: query.search,
              model: query.search,
            },
          };
        }
        const response = await apiService.get<[Vehicle[], number]>(
          `/vehicles?filters=${encodeURIComponent(JSON.stringify(filters))}`
        );
        if (!isCurrent()) return;
        setLoadError(false);
        setVehicles(response[0]);
        setTotal(response[1]);
      } catch (error) {
        if (isCurrent()) {
          setLoadError(true);
          message.error('Errore nel caricamento dei veicoli');
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    load();
  }, [query, beginRequest]);

  const handleTableChange: TableProps<Vehicle>['onChange'] = (pag) => {
    setQuery((q) => ({ ...q, page: pag.current ?? 1, pageSize: pag.pageSize ?? q.pageSize }));
  };

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => typeLabels[type] || type,
    },
    { title: 'Targa', dataIndex: 'licensePlate', key: 'licensePlate' },
    {
      title: 'Marca/Modello',
      key: 'brandModel',
      render: (_: unknown, record: Vehicle) =>
        [record.brand, record.model].filter(Boolean).join(' ') || '-',
    },
    { title: 'Posti', dataIndex: 'seats', key: 'seats' },
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
      render: (_: unknown, record: Vehicle) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/vehicles/${record.uuid}`)}
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
        <h1 className="text-2xl font-bold" style={{ margin: 0 }}>Veicoli</h1>
        <div className={`flex flex-wrap gap-2 ${isMobile ? '' : 'justify-end items-center'}`}>
          <SearchBox
            value={searchText}
            onChange={setSearchText}
            onSearch={(value) => setQuery((q) => ({ ...q, search: value, page: 1 }))}
            placeholder="Cerca veicolo…"
            ariaLabel="Cerca veicolo"
            width={isMobile ? '100%' : 240}
          />
          {canManageVehicles && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/vehicles/new')}
            >
              Nuovo Veicolo
            </Button>
          )}
        </div>
      </div>

      <Table<Vehicle>
        columns={columns}
        dataSource={vehicles}
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
