import { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Statistic, Spin, Table, Grid, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import SearchableSelect from '../../components/SearchableSelect';
import { formatEuro, italianStatisticProps } from '../../helpers/format';

const { RangePicker } = DatePicker;
const { useBreakpoint } = Grid;

interface Statistics {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  byCategory: CategoryRow[];
  byMonth: { month: string; income: number; expense: number }[];
}

/** Una riga per categoria E tipo (entrate e uscite separate). */
interface CategoryRow {
  categoryUuid: string | null;
  categoryName: string;
  type: 'INCOME' | 'EXPENSE';
  total: number;
}

const money = (v: number | string | null | undefined) => formatEuro(Number(v ?? 0));

export default function StatisticsPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Statistics | null>(null);
  const { token } = theme.useToken();
  const incomeColor = token.colorSuccessText;
  const expenseColor = token.colorErrorText;
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();

  useEffect(() => {
    loadStats();
  }, [dateRange, selectedCategory]);

  const loadStats = async () => {
    setLoading(true);
    try {
      let url = '/transactions/statistics?';
      if (dateRange) {
        url += `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}&`;
      }
      if (selectedCategory) {
        url += `categoryUuid=${encodeURIComponent(selectedCategory)}`;
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
      render: (v: number) => <span style={{ color: incomeColor }}>{money(v)}</span>,
    },
    {
      title: 'Uscite',
      dataIndex: 'expense',
      key: 'expense',
      render: (v: number) => <span style={{ color: expenseColor }}>{money(v)}</span>,
    },
    {
      title: 'Bilancio',
      key: 'balance',
      render: (_: unknown, record: { income: number; expense: number }) => {
        const balance = Number(record.income) - Number(record.expense);
        return (
          <span style={{ color: balance >= 0 ? incomeColor : expenseColor }}>
            {money(balance)}
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
      render: (v: number, record: CategoryRow) => (
        <span style={{ color: record.type === 'INCOME' ? incomeColor : expenseColor }}>
          {money(v)}
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
            {/* select paginata e ricercabile (stesso endpoint di CategorySelect) */}
            <SearchableSelect
              endpoint="/categories/search"
              style={{ width: isMobile ? '100%' : 240 }}
              placeholder="Tutte le categorie"
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
            />
          </div>
        </div>
      </Card>

      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              {...italianStatisticProps}
              title="Totale Entrate"
              value={stats?.totalIncome || 0}
              precision={2}
              prefix={<ArrowUpOutlined />}
              suffix="€"
              valueStyle={{ color: incomeColor }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              {...italianStatisticProps}
              title="Totale Uscite"
              value={stats?.totalExpense || 0}
              precision={2}
              prefix={<ArrowDownOutlined />}
              suffix="€"
              valueStyle={{ color: expenseColor }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              {...italianStatisticProps}
              title="Bilancio"
              value={stats?.balance || 0}
              precision={2}
              suffix="€"
              valueStyle={{ color: Number(stats?.balance || 0) >= 0 ? incomeColor : expenseColor }}
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
              pagination={{ pageSize: 12, size: 'small', hideOnSinglePage: true, showSizeChanger: false }}
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
              rowKey={(record: CategoryRow) => `${record.categoryUuid ?? 'none'}-${record.type}`}
              pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true, showSizeChanger: false }}
              size="small"
              scroll={isMobile ? { x: 300 } : undefined}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
