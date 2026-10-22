import { useState, useEffect } from 'react';
import { Table, Button, Tag, Select, Tooltip, Grid, theme, type TableProps } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EyeOutlined, FileTextOutlined, WarningOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../../services/ApiService';
import HotelBookingModal from './HotelBookingModal';
import SearchBox from '../../components/SearchBox';
import { useCapability } from '../../hooks/useAuth';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import dayjs from 'dayjs';
import { LoadErrorEmpty } from '../../components/StatusPages';

const { useBreakpoint } = Grid;

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

const statusLabels: Record<string, string> = {
  ACTIVE: 'Attivo',
  INACTIVE: 'Inattivo',
  SUSPENDED: 'Sospeso',
};

const memberTypeLabels: Record<string, string> = {
  ATHLETE: 'Atleta',
  PARENT: 'Genitore',
  MEMBER: 'Tesserato',
};

type SortDir = 'ascend' | 'descend' | null;

/** Tutto ciò che determina la richiesta: un solo stato → nessun valore "vecchio" letto per errore. */
interface Query {
  page: number;
  pageSize: number;
  /** ricerca confermata (Invio/Cerca), non il testo che si sta scrivendo */
  search: string;
  type: string | null;
  competitor: boolean | null;
  nameSort: SortDir;
}

export default function MembersPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const canManageMembers = useCapability('CAN_MANAGE_MEMBERS');
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState<Query>({
    page: 1,
    pageSize: 10,
    search: '',
    type: null,
    competitor: null,
    nameSort: null,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [hotelModalOpen, setHotelModalOpen] = useState(false);
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const beginRequest = useLatestRequest();

  useEffect(() => {
    const isCurrent = beginRequest();
    const load = async () => {
      setLoading(true);
      try {
        const filters: Record<string, unknown> = { page: query.page, pageSize: query.pageSize };

        const equal: Record<string, unknown> = {};
        if (query.type) equal.memberType = query.type;
        if (query.competitor !== null) equal.isCompetitor = query.competitor;
        if (Object.keys(equal).length > 0) filters.andFilters = { equal };

        if (query.search) {
          filters.orFilters = {
            like: {
              firstName: query.search,
              lastName: query.search,
              email: query.search,
              fisiCode: query.search,
              fisCode: query.search,
            },
          };
        }

        // ordinamento sul server (nomi cifrati: il backend li ordina in memoria su tutti i risultati, non sulla pagina)
        if (query.nameSort) {
          const dir = query.nameSort === 'ascend' ? 'ASC' : 'DESC';
          filters.orderBy = { lastName: dir, firstName: dir };
        }

        const response = await apiService.get<[Member[], number]>(
          `/members?filters=${encodeURIComponent(JSON.stringify(filters))}`
        );
        if (!isCurrent()) return;
        setLoadError(false);
        setMembers(response[0]);
        setTotal(response[1]);
      } catch (error) {
        if (isCurrent()) {
          setLoadError(true);
          message.error('Errore nel caricamento dei tesserati');
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    load();
  }, [query, beginRequest]);

  const updateFilters = (patch: Partial<Query>) => setQuery((q) => ({ ...q, ...patch, page: 1 }));

  const handleTableChange: TableProps<Member>['onChange'] = (pag, _filters, sorter, extra) => {
    if (extra.action === 'sort') {
      const s = Array.isArray(sorter) ? sorter[0] : sorter;
      updateFilters({ nameSort: s?.columnKey === 'name' ? (s.order ?? null) : null });
      return;
    }
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

  const columns: TableProps<Member>['columns'] = [
    {
      title: 'Nome',
      key: 'name',
      render: (_: unknown, record: Member) => `${record.lastName} ${record.firstName}`,
      sorter: true,
      sortOrder: query.nameSort,
      sortDirections: ['ascend', 'descend'],
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
              <WarningOutlined style={{ color: token.colorError, fontSize: 16 }} aria-label="Visita medica scaduta" />
            </Tooltip>
          );
        }
        if (expiring) {
          return (
            <Tooltip title={`Visita medica in scadenza il ${dayjs(record.medicalExamExpiry).format('DD/MM/YYYY')}`}>
              <WarningOutlined style={{ color: token.colorWarning, fontSize: 16 }} aria-label="Visita medica in scadenza" />
            </Tooltip>
          );
        }
        return null;
      },
    },
    ...(!isMobile ? [{ title: 'Email', dataIndex: 'email', key: 'email' }] : []),
    ...(!isMobile ? [{ title: 'Telefono', dataIndex: 'phone', key: 'phone' }] : []),
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
    ...(!isMobile ? [{ title: 'Codice FISI', dataIndex: 'fisiCode', key: 'fisiCode' }] : []),
    ...(!isMobile ? [{ title: 'Codice FIS', dataIndex: 'fisCode', key: 'fisCode' }] : []),
    {
      title: 'Stato',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag color={statusColors[status]}>{statusLabels[status] || status}</Tag>,
    },
    {
      title: 'Azioni',
      key: 'actions',
      width: isMobile ? 80 : undefined,
      render: (_: unknown, record: Member) => (
        <Button
          size={isMobile ? 'small' : 'middle'}
          icon={<EyeOutlined />}
          onClick={() => navigate(`/members/${record.uuid}`)}
          aria-label={`Dettagli ${record.lastName} ${record.firstName}`}
        >
          {isMobile ? '' : 'Dettagli'}
        </Button>
      ),
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    // mantiene la selezione cambiando pagina (lista alberghiera su più pagine)
    preserveSelectedRowKeys: true,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
    getCheckboxProps: (record: Member) => ({
      disabled: !record.isCompetitor,
      name: record.uuid,
    }),
  };

  // su mobile i controlli restano di altezza normale: più facili da toccare
  const controlSize = 'middle' as const;

  return (
    <div>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center gap-3'} mb-4`}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 'bold', margin: 0 }}>Tesserati</h1>
        <div className={`flex flex-wrap gap-2 ${isMobile ? '' : 'justify-end items-center'}`}>
          <SearchBox
            value={searchText}
            onChange={setSearchText}
            onSearch={(value) => updateFilters({ search: value })}
            placeholder="Cerca tesserato…"
            ariaLabel="Cerca tesserato"
            width={isMobile ? '100%' : 240}
            size={controlSize}
          />
          <Select
            placeholder="Tipo"
            allowClear
            value={query.type ?? undefined}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
            size={controlSize}
            aria-label="Filtra per tipo"
            onChange={(value) => updateFilters({ type: value ?? null })}
            options={[
              { value: 'ATHLETE', label: 'Atleta' },
              { value: 'PARENT', label: 'Genitore' },
              { value: 'MEMBER', label: 'Tesserato' },
            ]}
          />
          <Select
            placeholder="Agonista"
            allowClear
            value={query.competitor ?? undefined}
            style={{ width: isMobile ? 'calc(50% - 4px)' : 120 }}
            size={controlSize}
            aria-label="Filtra per agonista"
            onChange={(value) => updateFilters({ competitor: value === undefined ? null : value })}
            options={[
              { value: true, label: 'Sì' },
              { value: false, label: 'No' },
            ]}
          />
          <Button
            icon={<FileTextOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={() => setHotelModalOpen(true)}
            size={controlSize}
          >
            Lista Alberghiera ({selectedRowKeys.length})
          </Button>
          {canManageMembers && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/members/new')}
              size={controlSize}
            >
              Nuovo Tesserato
            </Button>
          )}
        </div>
      </div>

      <div className="mb-2 text-gray-500">
        Seleziona gli atleti agonisti per generare la lista prenotazione alberghiera
      </div>

      <Table<Member>
        rowSelection={rowSelection}
        columns={columns}
        dataSource={members}
        locale={loadError ? { emptyText: <LoadErrorEmpty onRetry={() => setQuery((q) => ({ ...q }))} /> } : undefined}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: isMobile ? 500 : undefined }}
        size={isMobile ? 'small' : 'middle'}
        showSorterTooltip={{ title: 'Ordina per cognome e nome' }}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: !isMobile,
          showTotal: isMobile ? undefined : (t, range) => `${range[0]}-${range[1]} di ${t}`,
          pageSizeOptions: ['10', '20', '50', '100'],
          size: isMobile ? 'small' : 'default',
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
