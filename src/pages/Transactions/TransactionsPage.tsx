import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Space, Tag, Popconfirm, Tooltip, Upload, Alert } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined, UploadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService, getApiBaseUrl } from '../../services/ApiService';
import { authService } from '../../services/AuthService';
import CategorySelect from '../../components/CategorySelect';

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

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState<PaginationState>({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [categoryName, setCategoryName] = useState<string>('');
  const [categoryUuid, setCategoryUuid] = useState<string | undefined>();
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; errors: { row: number; error: string }[] } | null>(null);

  // Filtri
  const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [filterYear, setFilterYear] = useState<number | null>(new Date().getFullYear());
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [initialLoad, setInitialLoad] = useState(true);

  // Caricamento iniziale
  useEffect(() => {
    loadData(1, 10);
  }, []);

  // Ricarica quando cambiano i filtri (dopo il caricamento iniziale)
  useEffect(() => {
    if (!initialLoad) {
      loadData(1, pagination.pageSize);
    }
    setInitialLoad(false);
  }, [filterType, filterYear, sortOrder]);

  const loadData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const filtersObj: any = {
        page,
        pageSize,
        relations: { category: true },
        orderBy: { date: sortOrder },
        andFilters: {},
      };

      if (filterYear !== null) {
        const startDate = `${filterYear}-01-01`;
        const endDate = `${filterYear}-12-31`;
        filtersObj.andFilters.between = { date: [startDate, endDate] };
      }
      
      if (filterType !== 'ALL') {
        if (!filtersObj.andFilters.equal) {
          filtersObj.andFilters.equal = {};
        }
        filtersObj.andFilters.equal.type = filterType;
      }

      const filters = JSON.stringify(filtersObj);
      const response = await apiService.get<[Transaction[], number]>(
        `/transactions?filters=${encodeURIComponent(filters)}`
      );
      setTransactions(response[0]);
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

  const handleSave = async (values: Record<string, unknown>) => {
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
      loadData(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Errore nel salvataggio');
    }
  };

  const handleDelete = async (uuid: string) => {
    try {
      await apiService.delete(`/transactions/${uuid}`);
      message.success('Movimento eliminato');
      loadData(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error('Errore nella cancellazione');
    }
  };

  const openModal = (transaction?: Transaction) => {
    setEditingTransaction(transaction || null);
    if (transaction) {
      form.setFieldsValue({
        ...transaction,
        date: dayjs(transaction.date),
      });
      setCategoryName(transaction.category?.name || '');
      setCategoryUuid(transaction.categoryUuid);
    } else {
      form.resetFields();
      form.setFieldsValue({ date: dayjs(), type: 'EXPENSE' });
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

      const result = await apiService.post<{ imported: number; updated: number; errors: { row: number; error: string }[] }>(
        '/transactions/import-excel',
        formData
      );

      setImportResult(result);

      if (result.errors.length === 0) {
        message.success(`Import completato: ${result.imported} nuove, ${result.updated} aggiornate`);
      } else {
        message.warning(`Import completato con errori: ${result.imported} nuove, ${result.updated} aggiornate, ${result.errors.length} errori`);
      }

      loadData(pagination.current, pagination.pageSize);
    } catch (error: any) {
      message.error(error?.response?.data?.message || 'Errore durante l\'import');
    } finally {
      setImporting(false);
    }
  };

  const handleImportModalClose = () => {
    setImportModalOpen(false);
    setImportFile(null);
    setImportResult(null);
  };

  const handleViewReceipt = (uuid: string) => {
    const token = authService.getToken();
    window.open(`${getApiBaseUrl()}/transactions/${uuid}/receipt?token=${token}`, '_blank');
  };

  const columns = [
    {
      title: 'Azioni',
      key: 'actions',
      width: 100,
      fixed: 'left' as const,
      render: (_: unknown, record: Transaction) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} size="small" />
          <Popconfirm title="Eliminare?" onConfirm={() => handleDelete(record.uuid)}>
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
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
              icon={<FilePdfOutlined style={{ fontSize: 18, color: '#ff4d4f' }} />}
              onClick={() => handleViewReceipt(record.uuid)}
            />
          </Tooltip>
        ) : null
      ),
    },
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
          <span style={{ color: '#ff4d4f' }}>€{Number(record.amount).toFixed(2)}</span>
        ) : '-'
      ),
    },
    {
      title: 'Entrate',
      key: 'income',
      width: 100,
      render: (_: unknown, record: Transaction) => (
        record.type === 'INCOME' ? (
          <span style={{ color: '#52c41a' }}>€{Number(record.amount).toFixed(2)}</span>
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
          <span style={{ color: record.type === 'INCOME' ? '#52c41a' : '#ff4d4f' }}>
            €{Number(amount).toFixed(2)}
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
  const years = Array.from({ length: currentYear - 2019 }, (_, i) => currentYear - i);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Movimenti Finanziari</h1>
        <Space>
          <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
            Importa Excel
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
            Nuovo Movimento
          </Button>
        </Space>
      </div>

      <div className="flex gap-4 mb-4">
        <div>
          <span className="mr-2">Anno:</span>
          <Select
            value={filterYear}
            onChange={setFilterYear}
            style={{ width: 120 }}
          >
            <Select.Option value={null}>Tutti</Select.Option>
            {years.map(year => (
              <Select.Option key={year} value={year}>{year}</Select.Option>
            ))}
          </Select>
        </div>
        <div>
          <span className="mr-2">Tipo:</span>
          <Select
            value={filterType}
            onChange={setFilterType}
            style={{ width: 120 }}
          >
            <Select.Option value="ALL">Tutti</Select.Option>
            <Select.Option value="INCOME">Entrate</Select.Option>
            <Select.Option value="EXPENSE">Uscite</Select.Option>
          </Select>
        </div>
        <div>
          <span className="mr-2">Ordine:</span>
          <Select
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: 150 }}
          >
            <Select.Option value="DESC">Data ↓ (recenti)</Select.Option>
            <Select.Option value="ASC">Data ↑ (vecchi)</Select.Option>
          </Select>
        </div>
        <div className="ml-auto">
          <Tag color="blue">Totale: {pagination.total} movimenti</Tag>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={transactions}
        rowKey="uuid"
        loading={loading}
        scroll={{ x: 1400 }}
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

      <Modal
        title={editingTransaction ? 'Modifica Movimento' : 'Nuovo Movimento'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setCategoryName('');
          setCategoryUuid(undefined);
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="amount" label="Importo" rules={[{ required: true }]}>
              <InputNumber min={0} precision={2} suffix="€" className="w-full" />
            </Form.Item>
            <Form.Item name="originalAmount" label="Importo Originale">
              <InputNumber min={0} precision={2} suffix="€" className="w-full" />
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
            description="Le transazioni esistenti con stessa data, importo, tipo e soggetto verranno sovrascritte."
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
            <UploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
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
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="text-red-500">Errori ({importResult.errors.length}):</p>
                      <ul className="list-disc list-inside text-sm max-h-32 overflow-y-auto">
                        {importResult.errors.map((err, idx) => (
                          <li key={idx}>Riga {err.row}: {err.error}</li>
                        ))}
                      </ul>
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
    </div>
  );
}
