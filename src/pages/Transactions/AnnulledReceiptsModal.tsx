import { useEffect, useState } from 'react';
import { Button, Modal, Select, Table, Tag, Typography } from 'antd';
import { FilePdfOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { apiService, getApiBaseUrl } from '../../services/ApiService';
import { authService } from '../../services/AuthService';
import { formatEuro } from '../../helpers/format';
import { message } from '../../services/notify';

interface AnnulledReceipt {
  uuid: string;
  source: 'annullata' | 'duplicato';
  receiptYear: number;
  receiptNumber: number;
  date: string | null;
  amount: number | null;
  subject: string | null;
  reason: string;
  annulledAt: string;
  hasPdf: boolean;
}

/**
 * Numeri di ricevuta non più in uso: ricevute annullate (movimento eliminato, diventato uscita o spostato di anno) e
 * numeri dei duplicati archiviati. I numeri emessi non vengono mai riassegnati: qui si vede dove "manca" un numero.
 */
export default function AnnulledReceiptsModal({ open, onClose, years }: { open: boolean; onClose: () => void; years: number[] }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [rows, setRows] = useState<AnnulledReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const canDownload = authService.hasCapability('CAN_MANAGE_TRANSACTIONS');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiService
      .get<AnnulledReceipt[]>(`/transactions/receipts/annulled${year ? `?year=${year}` : ''}`)
      .then(setRows)
      .catch(() => message.error('Errore nel caricamento delle ricevute annullate'))
      .finally(() => setLoading(false));
  }, [open, year]);

  const openPdf = (uuid: string) => {
    const token = authService.getToken();
    window.open(
      `${getApiBaseUrl()}/transactions/receipts/annulled/${uuid}/pdf?token=${encodeURIComponent(token ?? '')}`,
      '_blank',
    );
  };

  return (
    <Modal title="Ricevute annullate" open={open} onCancel={onClose} footer={null} width={900}>
      <Typography.Paragraph type="secondary">
        Un numero di ricevuta già emesso non cambia e non viene riassegnato. Qui trovi i numeri non più in uso, con il
        motivo e il PDF originale.
      </Typography.Paragraph>
      <Select
        allowClear
        placeholder="Tutti gli anni"
        value={year}
        onChange={(v) => setYear(v)}
        options={years.map((y) => ({ label: String(y), value: y }))}
        style={{ width: 160, marginBottom: 12 }}
        aria-label="Anno"
      />
      <Table<AnnulledReceipt>
        rowKey="uuid"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, size: 'small', hideOnSinglePage: true, showSizeChanger: false }}
        locale={{ emptyText: 'Nessuna ricevuta annullata' }}
        columns={[
          { title: 'N°', key: 'n', render: (_, r) => `${r.receiptNumber}/${r.receiptYear}`, width: 90 },
          { title: 'Data', dataIndex: 'date', render: (d: string | null) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'), width: 105 },
          { title: 'Soggetto', dataIndex: 'subject', render: (v: string | null) => v || '-' },
          { title: 'Importo', dataIndex: 'amount', align: 'right' as const, render: (v: number | null) => (v === null ? '-' : formatEuro(v)), width: 120 },
          {
            title: 'Motivo',
            key: 'reason',
            render: (_, r) => (
              <span>
                <Tag color={r.source === 'duplicato' ? 'default' : 'orange'}>{r.source === 'duplicato' ? 'Duplicato' : 'Annullata'}</Tag>
                {r.reason}
              </span>
            ),
          },
          {
            title: 'PDF',
            key: 'pdf',
            width: 70,
            render: (_, r) =>
              r.hasPdf && canDownload ? (
                <Button size="small" icon={<FilePdfOutlined />} onClick={() => openPdf(r.uuid)} aria-label="Apri PDF" />
              ) : (
                '-'
              ),
          },
        ]}
      />
    </Modal>
  );
}
