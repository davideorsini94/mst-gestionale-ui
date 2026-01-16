import { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Select, Statistic, Spin, Table, Grid } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

interface Statistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: { categoryName: string; total: number; type: string }[];
  byMonth: { month: string; income: number; expense: number }[];
}

interface Category {
  uuid: string;
  name: string;
}

export default function StatisticsPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistics | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadStats();
  }, [dateRange, selectedCategory]);

  const loadCategories = async () => {
    try {
      const data = await apiService.get<[Category[], number]>('/categories');
      setCategories(data[0]);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      let url = '/transactions/statistics?';
      if (dateRange) {
        url += `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}&`;
      }
      if (selectedCategory) {
        url += `categoryUuid=${selectedCategory}`;
      }
      const data = await apiService.get<Statistics>(url);
      setStats(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const monthColumns = [
    { title: 'Mese', dataIndex: 'month', key: 'month' },
    {
      title: 'Entrate',
      dataIndex: 'income',
      key: 'income',
      render: (v: number) => <span style={{ color: '#52c41a' }}>€{v.toFixed(2)}</span>,
    },
    {
      title: 'Uscite',
      dataIndex: 'expense',
      key: 'expense',
      render: (v: number) => <span style={{ color: '#ff4d4f' }}>€{v.toFixed(2)}</span>,
    },
    {
      title: 'Bilancio',
      key: 'balance',
      render: (_: unknown, record: { income: number; expense: number }) => {
        const balance = record.income - record.expense;
        return (
          <span style={{ color: balance >= 0 ? '#52c41a' : '#ff4d4f' }}>
            €{balance.toFixed(2)}
          </span>
        );
      },
    },
  ];

  const categoryColumns = [
    { title: 'Categoria', dataIndex: 'categoryName', key: 'categoryName' },
    {
      title: 'Totale',
      dataIndex: 'total',
      key: 'total',
      render: (v: number, record: { type: string }) => (
        <span style={{ color: record.type === 'INCOME' ? '#52c41a' : '#ff4d4f' }}>
          €{v.toFixed(2)}
        </span>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (type === 'INCOME' ? 'Entrata' : 'Uscita'),
    },
  ];

  if (loading && !stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl md:text-2xl font-bold mb-4">Statistiche Finanziarie</h1>

      <Card className="mb-4">
        <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 flex-wrap`}>
          <div className={isMobile ? 'w-full' : ''}>
            <label className="block mb-1 text-sm">Periodo</label>
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
              format="DD/MM/YYYY"
              size={isMobile ? 'middle' : 'middle'}
              className={isMobile ? 'w-full' : ''}
            />
          </div>
          <div className={isMobile ? 'w-full' : ''}>
            <label className="block mb-1 text-sm">Categoria</label>
            <Select
              style={{ width: isMobile ? '100%' : 200 }}
              allowClear
              placeholder="Tutte le categorie"
              value={selectedCategory}
              onChange={setSelectedCategory}
            >
              {categories.map((cat) => (
                <Select.Option key={cat.uuid} value={cat.uuid}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Totale Entrate"
              value={stats?.totalIncome || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="€"
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Totale Uscite"
              value={stats?.totalExpense || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="€"
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Bilancio"
              value={stats?.balance || 0}
              precision={2}
              suffix="€"
              valueStyle={{ color: (stats?.balance || 0) >= 0 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Andamento Mensile" loading={loading}>
            <Table
              columns={monthColumns}
              dataSource={stats?.byMonth || []}
              rowKey="month"
              pagination={false}
              size="small"
              scroll={isMobile ? { x: 400 } : undefined}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Per Categoria" loading={loading}>
            <Table
              columns={categoryColumns}
              dataSource={stats?.byCategory || []}
              rowKey="categoryName"
              pagination={false}
              size="small"
              scroll={isMobile ? { x: 300 } : undefined}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
