import { useState, useEffect } from 'react';
import { Table, Button, Tag, Space, Input } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';

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

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData(1, 10);
  }, []);

  const loadData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const filters: any = {
        page,
        pageSize,
      };

      if (search) {
        filters.orFilters = {
          like: {
            name: search,
            licensePlate: search,
            brand: search,
            model: search,
          },
        };
      }

      const response = await apiService.get<[Vehicle[], number]>(
        `/vehicles?filters=${encodeURIComponent(JSON.stringify(filters))}`
      );
      setVehicles(response[0]);
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
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Veicoli</h1>
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
            onClick={() => navigate('/vehicles/new')}
          >
            Nuovo Veicolo
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={vehicles}
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
