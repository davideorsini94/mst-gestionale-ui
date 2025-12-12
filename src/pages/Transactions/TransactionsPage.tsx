import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, DatePicker, InputNumber, message, Space, Tag, Popconfirm, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FilePdfOutlined } from '@ant-design/icons';
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

  useEffect(() => {
    loadData(1, 10);
  }, []);

  const loadData = async (page: number, pageSize: number) => {
    setLoading(true);
    try {
      const filters = JSON.stringify({
        page,
        pageSize,
        relations: { category: true },
      });
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

  const handleViewReceipt = (uuid: string) => {
    const token = authService.getToken();
    window.open(`${getApiBaseUrl()}/transactions/${uuid}/receipt?token=${token}`, '_blank');
  };

  const columns = [
    {
      title: 'Data',
      dataIndex: 'date',
      key: 'date',
      width: 100,
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
    {
      title: 'Ricevuta',
      key: 'receipt',
      width: 80,
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
      title: 'Azioni',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Transaction) => (
        <Space>
          <Button icon={<EditOutlined />} onClick={() => openModal(record)} size="small" />
          <Popconfirm title="Eliminare?" onConfirm={() => handleDelete(record.uuid)}>
            <Button icon={<DeleteOutlined />} danger size="small" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Movimenti Finanziari</h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal()}>
          Nuovo Movimento
        </Button>
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
    </div>
  );
}
