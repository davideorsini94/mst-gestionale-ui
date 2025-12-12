import { useState } from 'react';
import { Modal, Button, Spin, Divider, message } from 'antd';
import { PrinterOutlined, CopyOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import dayjs from 'dayjs';

interface HotelBookingEntry {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
}

interface HotelBookingList {
  males: HotelBookingEntry[];
  females: HotelBookingEntry[];
  generatedAt: string;
  totalCount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  memberUuids: string[];
}

export default function HotelBookingModal({ open, onClose, memberUuids }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HotelBookingList | null>(null);

  const loadData = async () => {
    if (memberUuids.length === 0) return;
    
    setLoading(true);
    try {
      const result = await apiService.post<HotelBookingList>('/members/hotel-booking-list', {
        memberUuids,
      });
      setData(result);
    } catch (error) {
      message.error('Errore nella generazione della lista');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    if (open && memberUuids.length > 0) {
      loadData();
    }
  };

  // Load data when modal opens
  useState(() => {
    if (open) {
      handleOpen();
    }
  });

  const formatDate = (date: string) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : '-';
  };

  const renderEntry = (entry: HotelBookingEntry, index: number) => (
    <div key={index} className="py-2 border-b last:border-b-0">
      <div className="font-medium">
        {index + 1}. {entry.lastName} {entry.firstName}
      </div>
      <div className="text-gray-500 text-sm">
        Nato/a il {formatDate(entry.birthDate)} a {entry.birthPlace || '-'}
      </div>
    </div>
  );

  const generateTextList = () => {
    if (!data) return '';

    let text = `LISTA PRENOTAZIONE ALBERGHIERA\n`;
    text += `Generata il: ${dayjs(data.generatedAt).format('DD/MM/YYYY HH:mm')}\n`;
    text += `Totale partecipanti: ${data.totalCount}\n\n`;

    if (data.males.length > 0) {
      text += `=== MASCHI (${data.males.length}) ===\n`;
      data.males.forEach((m, i) => {
        text += `${i + 1}. ${m.lastName} ${m.firstName} - Nato il ${formatDate(m.birthDate)} a ${m.birthPlace || '-'}\n`;
      });
      text += '\n';
    }

    if (data.females.length > 0) {
      text += `=== FEMMINE (${data.females.length}) ===\n`;
      data.females.forEach((f, i) => {
        text += `${i + 1}. ${f.lastName} ${f.firstName} - Nata il ${formatDate(f.birthDate)} a ${f.birthPlace || '-'}\n`;
      });
    }

    return text;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateTextList());
    message.success('Lista copiata negli appunti');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Lista Prenotazione Alberghiera</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          h2 { font-size: 14px; margin-top: 20px; background: #f0f0f0; padding: 5px; }
          .entry { padding: 5px 0; border-bottom: 1px solid #eee; }
          .name { font-weight: bold; }
          .details { color: #666; font-size: 12px; }
          .meta { color: #999; font-size: 11px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>LISTA PRENOTAZIONE ALBERGHIERA</h1>
        <div class="meta">
          Generata il: ${dayjs(data?.generatedAt).format('DD/MM/YYYY HH:mm')}<br/>
          Totale partecipanti: ${data?.totalCount || 0}
        </div>
        
        ${data?.males.length ? `
          <h2>MASCHI (${data.males.length})</h2>
          ${data.males.map((m, i) => `
            <div class="entry">
              <div class="name">${i + 1}. ${m.lastName} ${m.firstName}</div>
              <div class="details">Nato il ${formatDate(m.birthDate)} a ${m.birthPlace || '-'}</div>
            </div>
          `).join('')}
        ` : ''}
        
        ${data?.females.length ? `
          <h2>FEMMINE (${data.females.length})</h2>
          ${data.females.map((f, i) => `
            <div class="entry">
              <div class="name">${i + 1}. ${f.lastName} ${f.firstName}</div>
              <div class="details">Nata il ${formatDate(f.birthDate)} a ${f.birthPlace || '-'}</div>
            </div>
          `).join('')}
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Modal
      title="Lista Prenotazione Alberghiera"
      open={open}
      onCancel={onClose}
      width={600}
      footer={[
        <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy} disabled={!data}>
          Copia
        </Button>,
        <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint} disabled={!data}>
          Stampa
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Chiudi
        </Button>,
      ]}
      afterOpenChange={(visible) => {
        if (visible) loadData();
      }}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : data ? (
        <div>
          <div className="text-gray-500 mb-4">
            Totale partecipanti: <strong>{data.totalCount}</strong>
          </div>

          {data.males.length > 0 && (
            <>
              <Divider orientation="left">Maschi ({data.males.length})</Divider>
              {data.males.map(renderEntry)}
            </>
          )}

          {data.females.length > 0 && (
            <>
              <Divider orientation="left">Femmine ({data.females.length})</Divider>
              {data.females.map(renderEntry)}
            </>
          )}

          {data.totalCount === 0 && (
            <div className="text-center text-gray-400 py-8">
              Nessun partecipante selezionato
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-gray-400 py-8">
          Seleziona almeno un atleta per generare la lista
        </div>
      )}
    </Modal>
  );
}
