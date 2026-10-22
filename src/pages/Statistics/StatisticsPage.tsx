import { useState, useEffect } from 'react';
import { Card, Row, Col, DatePicker, Statistic, Spin, Table, Grid, Result, Button, theme } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import SearchableSelect from '../../components/SearchableSelect';
import { formatEuro, italianStatisticProps } from '../../helpers/format';
import IncomeExpenseChart from './IncomeExpenseChart';
import { useLatestRequest } from '../../hooks/useLatestRequest';

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

/** "2026-09" → "settembre 2026" (locale italiano di dayjs impostato in index.tsx) */
const formatMonth = (month: string) =>
  /^\d{4}-\d{2}$/.test(month) ? dayjs(`${month}-01`).format('MMMM YYYY') : month;

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
  // errore di caricamento: niente totali a zero spacciati per veri, ma un messaggio con "Riprova"
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const beginRequest = useLatestRequest();

  useEffect(() => {
    loadStats();
  }, [dateRange, selectedCategory, reloadKey]);

  const loadStats = async () => {
    // cambiando periodo/categoria in fretta, conta solo la risposta dell'ultima richiesta
    const isCurrent = beginRequest();
    setLoading(true);
    setLoadError(false);
    try {
      let url = '/transactions/statistics?';
      if (dateRange) {
        url += `startDate=${dateRange[0].format('YYYY-MM-DD')}&endDate=${dateRange[1].format('YYYY-MM-DD')}&`;
      }
      if (selectedCategory) {
        url += `categoryUuid=${encodeURIComponent(selectedCategory)}`;
      }
      const data = await apiService.get<Statistics>(url);
      if (!isCurrent()) return;
      setStats(data);
    } catch (error) {
      if (!isCurrent()) return;
      console.error('Error loading statistics:', error);
      setStats(null);
      setLoadError(true);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  };

  const monthColumns = [
    { title: 'Mese', dataIndex: 'month', key: 'month', render: (m: string) => formatMonth(m) },
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

  if (loading && !stats && !loadError) {
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
            <label className="block mb-1 text-sm" id="stats-period-label">Periodo</label>
            {isMobile ? (
              // su telefono il calendario a due mesi del RangePicker esce dallo schermo: due date separate
              <div className="flex gap-2">
                <DatePicker
                  aria-label="Dal"
                  placeholder="Dal"
                  value={dateRange?.[0] ?? null}
                  onChange={(d) => setDateRange(d ? [d, dateRange?.[1] && !dateRange[1].isBefore(d) ? dateRange[1] : d] : null)}
                  format="DD/MM/YYYY"
                  inputReadOnly
                  className="flex-1"
                />
                <DatePicker
                  aria-label="Al"
                  placeholder="Al"
                  value={dateRange?.[1] ?? null}
                  disabledDate={(d) => !!dateRange?.[0] && d.isBefore(dateRange[0], 'day')}
                  onChange={(d) => setDateRange(d ? [dateRange?.[0] && !dateRange[0].isAfter(d) ? dateRange[0] : d, d] : null)}
                  format="DD/MM/YYYY"
                  inputReadOnly
                  className="flex-1"
                />
              </div>
            ) : (
              <RangePicker
                aria-labelledby="stats-period-label"
                value={dateRange}
                onChange={(dates) => setDateRange(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                format="DD/MM/YYYY"
              />
            )}
          </div>
          <div className={isMobile ? 'w-full' : ''}>
            <label className="block mb-1 text-sm" id="stats-category-label">Categoria</label>
            {/* select paginata e ricercabile (stesso endpoint di CategorySelect) */}
            <SearchableSelect
              endpoint="/categories/search"
              style={{ width: isMobile ? '100%' : 240 }}
              placeholder="Tutte le categorie"
              aria-labelledby="stats-category-label"
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
            />
          </div>
        </div>
      </Card>

      {loadError ? (
        <Card>
          <Result
            status="error"
            title="Impossibile caricare le statistiche"
            subTitle="I dati non sono disponibili in questo momento: i totali non vengono mostrati per non confonderli con valori reali."
            extra={
              <Button type="primary" onClick={() => setReloadKey((k) => k + 1)} loading={loading}>
                Riprova
              </Button>
            }
          />
        </Card>
      ) : (
        <>
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

          <Card title="Entrate e uscite" className="mb-4" loading={loading && !stats}>
            <IncomeExpenseChart byMonth={stats?.byMonth || []} isMobile={isMobile} />
          </Card>

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
        </>
      )}
    </div>
  );
}
