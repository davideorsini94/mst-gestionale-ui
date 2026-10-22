import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, Space, Tag, Popconfirm, Tooltip, Upload, Alert, Grid, Typography, Badge, theme, type TableProps } from 'antd';
import { message } from '../../services/notify';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, UploadOutlined, ToolOutlined, StopOutlined, FilterOutlined, DownOutlined, UpOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import CategorySelect from '../../components/CategorySelect';
import AnnulledReceiptsModal from './AnnulledReceiptsModal';
import { formatEuro, euroInputNumberProps } from '../../helpers/format';
import { getErrorMessage } from '../../helpers/errors';
import { openProtectedFile } from '../../helpers/openFile';
import { useCapability } from '../../hooks/useAuth';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { LoadErrorEmpty } from '../../components/StatusPages';

const { useBreakpoint } = Grid;

interface Transaction {
  uuid: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  originalAmount?: number;
  date: string;
  subject?: string;
  description?: string;
  categoryUuid?: string;
  category?: { uuid: string; name: string };
  paymentMethod: string;
  counterpart?: string;
  notes?: string;
  notes2?: string;
  budgetItem?: string;
  receiptMinioPath?: string;
  receiptNumber?: number;
  receiptYear?: number;
}

interface TextFilters {
  subject: string;
  notes: string;
  notes2: string;
  budgetItem: string;
}

const EMPTY_TEXT_FILTERS: TextFilters = { subject: '', notes: '', notes2: '', budgetItem: '' };

export default function TransactionsPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const navigate = useNavigate();
  // vedere la pagina richiede CAN_VIEW_TRANSACTIONS (rotta protetta); creare, modificare, eliminare,
  // importare e aprire le ricevute richiede CAN_MANAGE_TRANSACTIONS (come nel backend)
  const canManageTransactions = useCapability('CAN_MANAGE_TRANSACTIONS');
  const incomeColor = token.colorSuccessText;
  const expenseColor = token.colorErrorText;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [form] = Form.useForm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryUuid, setCategoryUuid] = useState<string | undefined>();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [annulledOpen, setAnnulledOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; corrected?: number; errors: { row: number; error: string }[] } | null>(null);
  const [saving, setSaving] = useState(false);
  // su mobile i filtri stanno in un pannello apribile (prima occupavano tutta la prima schermata)
  const [filtersOpen, setFiltersOpen] = useState(false);
  // per ricaricare la pagina corrente dopo salvataggi/eliminazioni/import
  const [reloadKey, setReloadKey] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const beginRequest = useLatestRequest();

  // Filtri
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterYear, setFilterYear] = useState<number | null>(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [sortField, setSortField] = useState<string>('date');
  // testo nei campi (subito) e testo applicato alla ricerca (dopo una pausa nella digitazione)
  const [textFilters, setTextFilters] = useState<TextFilters>(EMPTY_TEXT_FILTERS);
  const [appliedText, setAppliedText] = useState<TextFilters>(EMPTY_TEXT_FILTERS);

  // filtri di testo con debounce: 500 ms dopo l'ultima battuta (subito se il campo viene svuotato)
  useEffect(() => {
    const cleared = (Object.keys(textFilters) as (keyof TextFilters)[]).some(
      (k) => textFilters[k] === '' && appliedText[k] !== '',
    );
    const timer = setTimeout(() => {
      setAppliedText(textFilters);
      setPage(1);
    }, cleared ? 0 : 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textFilters]);

  // un solo effetto per tutti i parametri: ogni cambio parte da valori aggiornati, le risposte vecchie si scartano
  useEffect(() => {
    const isCurrent = beginRequest();
    const load = async () => {
      setLoading(true);
      try {
        // Se ordiniamo per data, aggiungiamo createdAt come ordinamento secondario
        const orderBy = sortField === 'date'
          ? { date: sortOrder, createdAt: sortOrder }
          : { [sortField]: sortOrder };

        const andFilters: Record<string, Record<string, unknown>> = {};
        if (filterYear !== null) {
          andFilters.between = { date: [`${filterYear}-01-01`, `${filterYear}-12-31`] };
        }
        if (filterType !== 'ALL') {
          andFilters.equal = { type: filterType };
        }
        // Filtri di testo (like)
        const like = Object.fromEntries(Object.entries(appliedText).filter(([, v]) => v.trim() !== ''));
        if (Object.keys(like).length > 0) {
          andFilters.like = like;
        }

        const filters = JSON.stringify({
          page,
          pageSize,
          relations: { category: true },
          orderBy,
          andFilters,
        });
        const response = await apiService.get<[Transaction[], number]>(
          `/transactions?filters=${encodeURIComponent(filters)}`
        );
        if (!isCurrent()) return;
        setLoadError(false);
        setTransactions(response[0]);
        setTotal(response[1]);
      } catch (error) {
        if (isCurrent()) {
          setLoadError(true);
          message.error('Errore nel caricamento dei movimenti');
        }
      } finally {
        if (isCurrent()) setLoading(false);
      }
    };
    load();
  }, [page, pageSize, filterType, filterYear, sortOrder, sortField, appliedText, reloadKey, beginRequest]);

  const reload = () => setReloadKey((k) => k + 1);

  const handleTableChange: TableProps<Transaction>['onChange'] = (pag) => {
    setPage(pag.current ?? 1);
    setPageSize(pag.pageSize ?? pageSize);
  };

  // cambiare un filtro riporta alla prima pagina
  const withFirstPage = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  const setTextFilter = (key: keyof TextFilters, value: string) =>
    setTextFilters((f) => ({ ...f, [key]: value }));

  const activeFiltersCount =
    (filterType !== 'ALL' ? 1 : 0) +
    (filterYear !== new Date().getFullYear() ? 1 : 0) +
    Object.values(textFilters).filter((v) => v.trim() !== '').length;

  const handleSave = async (values: Record<string, unknown>) => {
    setSaving(true);
    try {
      const payload: any = {
        ...values,
        date: (values.date as dayjs.Dayjs).format('YYYY-MM-DD'),
      };

      // Gestione categoria: se c'è categoryUuid lo usa, altrimenti usa categoryName
      if (categoryUuid) {
        payload.categoryUuid = categoryUuid;
      } else if (categoryName) {
        payload.categoryName = categoryName;
      }
      delete payload.category; // Rimuovi il campo category dal form

      if (editingTransaction) {
        await apiService.put(`/transactions/${editingTransaction.uuid}`, payload);
        message.success('Movimento aggiornato');
      } else {
        await apiService.post('/transactions', payload);
        message.success('Movimento creato');
      }
      setModalOpen(false);
      form.resetFields();
      setEditingTransaction(null);
      setCategoryName('');
      setCategoryUuid(undefined);
      reload();
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel salvataggio del movimento'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await apiService.delete(`/transactions/${uuid}`);
      message.success('Movimento eliminato');
      reload();
    } catch (error) {
      message.error(getErrorMessage(error, "Errore nell'eliminazione del movimento"));
    }
  };

  const openModal = (transaction?: Transaction) => {
    setEditingTransaction(transaction || null);
    if (transaction) {
      form.setFieldsValue({
        ...transaction,
        date: dayjs(transaction.date),
        amount: Number(transaction.amount),
        originalAmount: transaction.originalAmount ? Number(transaction.originalAmount) : undefined,
      });
      setCategoryName(transaction.category?.name || '');
      setCategoryUuid(transaction.categoryUuid);
    } else {
      form.resetFields();
      form.setFieldsValue({ date: dayjs(), type: 'EXPENSE', paymentMethod: 'CASH' });
      setCategoryName('');
      setCategoryUuid(undefined);
    }
    setModalOpen(true);
  };

  const handleCategoryChange = (name: string, isNew: boolean, uuid?: string) => {
    setCategoryName(name);
    setCategoryUuid(isNew ? undefined : uuid);
  };

  const handleImportFileSelect = (file: File) => {
    setImportFile(file);
    setImportResult(null);
    return false;
  };

  const handleImportConfirm = async () => {
    if (!importFile) {
      message.error('Seleziona un file Excel');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const result = await apiService.post<{ imported: number; updated: number; corrected?: number; errors: { row: number; error: string }[] }>(
        '/transactions/import-excel',
        formData
      );

      setImportResult(result);

      if (result.errors.length === 0) {
        message.success(`Import completato: ${result.imported} nuove, ${result.updated} aggiornate${result.corrected ? `, ${result.corrected} importi corretti` : ''}`);
      } else {
        message.warning(`Import completato con errori: ${result.imported} nuove, ${result.updated} aggiornate, ${result.errors.length} errori`);
      }

      reload();
    } catch (error) {
      message.error(getErrorMessage(error, "Errore durante l'import"));
    } finally {
      setImporting(false);
    }
  };

  const handleImportModalClose = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  // PDF scaricato con l'header Authorization (niente token nell'URL e quindi nei log del server)
  const handleViewReceipt = (record: Transaction) => {
    openProtectedFile(
      `/transactions/${record.uuid}/receipt`,
      `ricevuta-${record.receiptNumber}-${record.receiptYear}.pdf`,
    ).catch((error) => message.error(getErrorMessage(error, 'Impossibile aprire la ricevuta')));
  };

  const columns: TableProps<Transaction>['columns'] = [
    ...(canManageTransactions ? [{
      title: 'Azioni',
      key: 'actions',
      width: 100,
      fixed: 'left' as const,
      render: (_: unknown, record: Transaction) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} size="small" aria-label="Modifica movimento" />
          <Popconfirm title="Eliminare il movimento?" okText="Elimina" cancelText="Annulla" onConfirm={() => handleDelete(record.uuid)}>
            <Button icon={<DeleteOutlined />} danger size="small" aria-label="Elimina movimento" />
          </Popconfirm>
        </Space>
      ),
    },
    // le ricevute PDF richiedono CAN_MANAGE_TRANSACTIONS (GET /transactions/:uuid/receipt)
    {
      title: 'Ric.',
      key: 'receipt',
      width: 60,
      fixed: 'left' as const,
      render: (_: unknown, record: Transaction) => (
        record.receiptMinioPath ? (
          <Tooltip title={`Ricevuta N° ${record.receiptNumber}/${record.receiptYear}`}>
            <Button
              type="link"
              icon={<FilePdfOutlined style={{ fontSize: 18, color: token.colorError }} />}
              onClick={() => handleViewReceipt(record)}
              aria-label={`Apri ricevuta N° ${record.receiptNumber}/${record.receiptYear}`}
            />
          </Tooltip>
        ) : null
      ),
    }] : []),
    {
      title: 'Data',
      dataIndex: 'date',
      key: 'date',
      width: 115,
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Uscite',
      key: 'expense',
      width: 100,
      render: (_: unknown, record: Transaction) => (
        record.type === 'EXPENSE' ? (
          <span style={{ color: expenseColor }}>{formatEuro(record.amount)}</span>
        ) : '-'
      ),
    },
    {
      title: 'Entrate',
      key: 'income',
      width: 100,
      render: (_: unknown, record: Transaction) => (
        record.type === 'INCOME' ? (
          <span style={{ color: incomeColor }}>{formatEuro(record.amount)}</span>
        ) : '-'
      ),
    },
    {
      title: 'Ditta-Ente-Soggetto',
      dataIndex: 'subject',
      key: 'subject',
      ellipsis: true,
    },
    {
      title: 'Tipo',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 100,
      render: (method: string) => {
        const labels: Record<string, string> = {
          CASH: 'Contanti',
          BANK_TRANSFER: 'Bonifico',
          CREDIT_CARD: 'Carta',
          CHECK: 'Assegno',
          OTHER: 'Altro',
        };
        return labels[method] || method;
      },
    },
    {
      title: 'Originale',
      dataIndex: 'originalAmount',
      key: 'originalAmount',
      width: 100,
      render: (amount: number | undefined, record: Transaction) => (
        amount ? (
          <span style={{ color: record.type === 'INCOME' ? incomeColor : expenseColor }}>
            {formatEuro(amount)}
          </span>
        ) : '-'
      ),
    },
    {
      title: 'Note',
      dataIndex: 'notes',
      key: 'notes',
      ellipsis: true,
    },
    {
      title: 'Note2',
      dataIndex: 'notes2',
      key: 'notes2',
      ellipsis: true,
    },
    {
      title: 'Voce Bilancio',
      key: 'budgetItem',
      render: (_: unknown, record: Transaction) => record.budgetItem || record.category?.name || '-',
    },
  ];

  // Genera lista anni (da 2020 all'anno corrente + 1)
  const currentYear = new Date().getFullYear();
  // i movimenti partono dal 2017; un anno in più per quelli già datati nel prossimo
  const years = Array.from({ length: currentYear + 1 - 2016 }, (_, i) => currentYear + 1 - i);

  // controlli ad altezza normale anche su mobile: più facili da toccare
  const controlSize = 'middle' as const;

  const filtersPanel = (
    <div id="tx-filters">
      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap gap-4 items-end'} mb-4`}>
        <div className={isMobile ? 'flex items-center justify-between' : ''}>
          <span className="mr-2 text-sm" id="tx-filter-year">Anno:</span>
          {/* "Tutti" con un valore stringa: antd non accetta null come valore di un'opzione */}
          <Select<number | 'ALL'>
            value={filterYear ?? 'ALL'}
            onChange={(v) => withFirstPage(setFilterYear)(v === 'ALL' ? null : v)}
            style={{ width: isMobile ? 140 : 100 }}
            size={controlSize}
            aria-labelledby="tx-filter-year"
            options={[
              { value: 'ALL', label: 'Tutti' },
              ...years.map((year) => ({ value: year, label: String(year) })),
            ]}
          />
        </div>
        <div className={isMobile ? 'flex items-center justify-between' : ''}>
          <span className="mr-2 text-sm" id="tx-filter-type">Tipo:</span>
          <Select
            value={filterType}
            onChange={withFirstPage(setFilterType)}
            style={{ width: isMobile ? 140 : 100 }}
            size={controlSize}
            aria-labelledby="tx-filter-type"
            options={[
              { value: 'ALL', label: 'Tutti' },
              { value: 'INCOME', label: 'Entrate' },
              { value: 'EXPENSE', label: 'Uscite' },
            ]}
          />
        </div>
        <div className={isMobile ? 'flex items-center justify-between' : ''}>
          <span className="mr-2 text-sm" id="tx-sort">Ordina per:</span>
          <Space.Compact>
            <Select
              value={sortField}
              onChange={withFirstPage(setSortField)}
              style={{ width: 140 }}
              size={controlSize}
              aria-labelledby="tx-sort"
              options={[
                { value: 'date', label: 'Data' },
                { value: 'type', label: 'Tipo' },
                { value: 'subject', label: 'Soggetto' },
                { value: 'notes', label: 'Note' },
                { value: 'notes2', label: 'Note 2' },
                { value: 'budgetItem', label: 'Voce Bilancio' },
                { value: 'amount', label: 'Importo' },
              ]}
            />
            <Select
              value={sortOrder}
              onChange={withFirstPage(setSortOrder)}
              style={{ width: 64 }}
              size={controlSize}
              aria-label="Direzione dell'ordinamento"
              options={[
                { value: 'DESC', label: <span aria-label="Decrescente">↓</span> },
                { value: 'ASC', label: <span aria-label="Crescente">↑</span> },
              ]}
            />
          </Space.Compact>
        </div>
      </div>

      <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap gap-4'} mb-4`}>
        <Input
          placeholder="Filtra Soggetto…"
          aria-label="Filtra per soggetto"
          value={textFilters.subject}
          onChange={(e) => setTextFilter('subject', e.target.value)}
          style={{ width: isMobile ? '100%' : 180 }}
          size={controlSize}
          allowClear
        />
        <Input
          placeholder="Filtra Note…"
          aria-label="Filtra per note"
          value={textFilters.notes}
          onChange={(e) => setTextFilter('notes', e.target.value)}
          style={{ width: isMobile ? '100%' : 180 }}
          size={controlSize}
          allowClear
        />
        <Input
          placeholder="Filtra Note 2…"
          aria-label="Filtra per note 2"
          value={textFilters.notes2}
          onChange={(e) => setTextFilter('notes2', e.target.value)}
          style={{ width: isMobile ? '100%' : 180 }}
          size={controlSize}
          allowClear
        />
        <Input
          placeholder="Filtra Voce Bilancio…"
          aria-label="Filtra per voce di bilancio"
          value={textFilters.budgetItem}
          onChange={(e) => setTextFilter('budgetItem', e.target.value)}
          style={{ width: isMobile ? '100%' : 180 }}
          size={controlSize}
          allowClear
        />
      </div>
    </div>
  );

  return (
    <div>
      <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'} mb-4`}>
        <h1 className="text-xl md:text-2xl font-bold">Movimenti Finanziari</h1>
        <Space size={isMobile ? 'small' : 'middle'} wrap>
          {canManageTransactions && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
              {isMobile ? 'Nuovo' : 'Nuovo Movimento'}
            </Button>
          )}
          {canManageTransactions && (
            <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
              {isMobile ? 'Importa' : 'Importa Excel'}
            </Button>
          )}
          <Button icon={<StopOutlined />} onClick={() => setAnnulledOpen(true)}>
            {isMobile ? 'Annullate' : 'Ricevute annullate'}
          </Button>
          {canManageTransactions && (
            <Button icon={<ToolOutlined />} onClick={() => navigate('/transactions/maintenance')}>
              {isMobile ? 'Manutenzione' : 'Manutenzione dati'}
            </Button>
          )}
        </Space>
      </div>

      {isMobile ? (
        <>
          <div className="flex items-center justify-between gap-2 mb-3">
            <Badge count={activeFiltersCount} size="small" offset={[-4, 4]}>
              <Button
                icon={<FilterOutlined />}
                onClick={() => setFiltersOpen((o) => !o)}
                aria-expanded={filtersOpen}
                aria-controls="tx-filters"
              >
                Filtri {filtersOpen ? <UpOutlined /> : <DownOutlined />}
              </Button>
            </Badge>
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>
              {filterYear ?? 'Tutti gli anni'} · {total} movimenti
            </Tag>
          </div>
          {filtersOpen && filtersPanel}
        </>
      ) : (
        <>
          {filtersPanel}
          <div className="flex justify-end -mt-2 mb-3">
            <Tag color="blue" style={{ marginInlineEnd: 0 }}>Totale: {total}</Tag>
          </div>
        </>
      )}

      <Table<Transaction>
        columns={columns}
        dataSource={transactions}
        locale={loadError ? { emptyText: <LoadErrorEmpty onRetry={() => setReloadKey((k) => k + 1)} /> } : undefined}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: canManageTransactions ? 1000 : 840 }}
        size={isMobile ? 'small' : 'middle'}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: !isMobile,
          showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} di ${total}`,
          pageSizeOptions: ['10', '20', '50', '100'],
          simple: isMobile,
        }}
        onChange={handleTableChange}
      />

      <Modal
        title={editingTransaction ? 'Modifica Movimento' : 'Nuovo Movimento'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setCategoryName('');
          setCategoryUuid(undefined);
          setEditingTransaction(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saving}
        okText="Salva"
        cancelText="Annulla"
        width={isMobile ? '100%' : 600}
        style={isMobile ? { top: 20, maxWidth: 'calc(100vw - 32px)', margin: '0 auto' } : undefined}
        // il form esiste anche a modale chiusa: openModal() lo riempie prima di aprirla (niente avviso useForm)
        forceRender
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          onFinishFailed={() => message.error('Compila tutti i campi obbligatori')}
          scrollToFirstError={{ block: 'center', focus: true }}
          size={isMobile ? 'middle' : 'large'}
        >
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            <Form.Item name="date" label="Data" rules={[{ required: true }]}>
              <DatePicker className="w-full" format="DD/MM/YYYY" />
            </Form.Item>
            <Form.Item name="type" label="Tipo" rules={[{ required: true }]}>
              <Select>
                <Select.Option value="INCOME">Entrata</Select.Option>
                <Select.Option value="EXPENSE">Uscita</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
            {/* niente min sull'input: un negativo veniva portato a 0,00 in silenzio; lo segnala la regola */}
            <Form.Item
              name="amount"
              label="Importo"
              rules={[
                { required: true, message: "Inserisci l'importo" },
                {
                  validator: (_, v) =>
                    v === undefined || v === null || v === '' || Number(v) >= 0.01
                      ? Promise.resolve()
                      : Promise.reject(new Error("L'importo deve essere maggiore di zero (per una spesa scegli il tipo Uscita)")),
                },
                { type: 'number', max: 99999999.99, message: 'Importo troppo grande (massimo 99.999.999,99)' },
              ]}
            >
              <InputNumber precision={2} {...euroInputNumberProps} suffix="€" className="w-full" />
            </Form.Item>
            <Form.Item
              name="originalAmount"
              label="Importo Originale"
              rules={[
                {
                  validator: (_, v) =>
                    v === undefined || v === null || v === '' || Number(v) >= 0
                      ? Promise.resolve()
                      : Promise.reject(new Error("L'importo originale non può essere negativo")),
                },
              ]}
            >
              <InputNumber precision={2} {...euroInputNumberProps} suffix="€" className="w-full" />
            </Form.Item>
          </div>
          <Form.Item name="subject" label="Ditta-Ente-Soggetto">
            <Input placeholder="Es: Mario Rossi, Azienda XYZ" />
          </Form.Item>
          <Form.Item name="paymentMethod" label="Tipo Pagamento">
            <Select>
              <Select.Option value="CASH">Contanti</Select.Option>
              <Select.Option value="BANK_TRANSFER">Bonifico</Select.Option>
              <Select.Option value="CREDIT_CARD">Carta di Credito</Select.Option>
              <Select.Option value="CHECK">Assegno</Select.Option>
              <Select.Option value="OTHER">Altro</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="notes" label="Note">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="notes2" label="Note2">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Voce Bilancio">
            <CategorySelect
              value={categoryName}
              onChange={handleCategoryChange}
              placeholder="Cerca o crea voce bilancio..."
              categoryType={form.getFieldValue('type')}
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Importa Transazioni da Excel"
        open={importModalOpen}
        onCancel={handleImportModalClose}
        footer={[
          <Button key="cancel" onClick={handleImportModalClose}>
            Annulla
          </Button>,
          <Button
            key="import"
            type="primary"
            loading={importing}
            disabled={!importFile}
            onClick={handleImportConfirm}
          >
            Conferma Import
          </Button>,
        ]}
        width={600}
      >
        <div className="mb-4">
          <p className="mb-2">
            Seleziona un file Excel (.xlsx o .xls) con le seguenti colonne:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mb-4">
            <li><strong>data</strong> - Data della transazione (DD/MM/YYYY)</li>
            <li><strong>tipo</strong> - "Entrata" o "Uscita"</li>
            <li><strong>importo</strong> - Importo della transazione</li>
            <li><strong>importo_originale</strong> - Importo originale (opzionale)</li>
            <li><strong>soggetto</strong> - Ditta/Ente/Soggetto (opzionale)</li>
            <li><strong>categoria</strong> - Categoria/Voce bilancio (opzionale)</li>
            <li><strong>metodo_pagamento</strong> - Contanti, Bonifico, Carta, Assegno, Altro (opzionale)</li>
            <li><strong>note</strong> - Note (opzionale)</li>
            <li><strong>note2</strong> - Note aggiuntive (opzionale)</li>
            <li><strong>voce_bilancio</strong> - Voce di bilancio (opzionale)</li>
          </ul>
          <Alert
            message="Attenzione"
            description="Le transazioni esistenti con stessa data, importo, tipo e soggetto verranno aggiornate. Le righe già importate in passato con l'importo sbagliato (migliaia lette come pochi euro) vengono riconosciute e corrette, senza creare duplicati."
            type="warning"
            showIcon
            className="mb-4"
          />
        </div>

        <Upload.Dragger
          accept=".xlsx,.xls,.csv"
          beforeUpload={handleImportFileSelect}
          showUploadList={false}
          disabled={importing}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
          </p>
          <p className="ant-upload-text">
            {importFile ? importFile.name : 'Clicca o trascina il file qui'}
          </p>
          <p className="ant-upload-hint">
            Supporta file Excel (.xlsx, .xls) e CSV (.csv)
          </p>
        </Upload.Dragger>

        {importResult && (
          <div className="mt-4">
            <Alert
              message="Risultato Import"
              description={
                <div>
                  <p>Transazioni importate: <strong>{importResult.imported}</strong></p>
                  <p>Transazioni aggiornate: <strong>{importResult.updated}</strong></p>
                  {!!importResult.corrected && (
                    <p>
                      Importi corretti (erano stati salvati male da un import precedente):{' '}
                      <strong>{importResult.corrected}</strong>
                    </p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <Typography.Text type="danger" strong>
                        Errori ({importResult.errors.length}):
                      </Typography.Text>
                      <Table
                        className="mt-2"
                        size="small"
                        dataSource={importResult.errors.map((err, idx) => ({ ...err, key: idx }))}
                        columns={[
                          { title: 'Riga', dataIndex: 'row', key: 'row', width: 70 },
                          { title: 'Errore', dataIndex: 'error', key: 'error' },
                        ]}
                        pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true, showSizeChanger: false }}
                        scroll={{ x: 'max-content' }}
                      />
                    </div>
                  )}
                </div>
              }
              type={importResult.errors.length > 0 ? 'warning' : 'success'}
              showIcon
            />
          </div>
        )}
      </Modal>
      <AnnulledReceiptsModal open={annulledOpen} onClose={() => setAnnulledOpen(false)} years={years} />
    </div>
  );
}
