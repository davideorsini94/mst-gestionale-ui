import { useState } from 'react';
import { Modal, Button, Spin, Divider, Alert, Checkbox, Space, Typography } from 'antd';
import { message } from '../../services/notify';
import { PrinterOutlined, CopyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { apiService } from '../../services/ApiService';
import { authService } from '../../services/AuthService';
import { getErrorMessage } from '../../helpers/errors';
import dayjs from 'dayjs';

interface HotelBookingEntry {
  firstName: string;
  lastName: string;
  birthDate: string;
  birthPlace: string;
  gender: string;
  /** Atleta o Allenatore (staff aggiunto alla lista) */
  role?: 'Atleta' | 'Allenatore';
}

interface StaffOption {
  uuid: string;
  firstName: string;
  lastName: string;
  staffRole?: string;
  status?: string;
  coachLevel?: string | null;
}

const staffRoleLabels: Record<string, string> = {
  INSTRUCTOR: 'Istruttore',
  DRIVER: 'Autista',
  ADMIN: 'Amministrativo',
  VOLUNTEER: 'Volontario',
  OTHER: 'Altro',
};

/** Allenatori prima (istruttori o con abilitazione), poi gli altri, per cognome */
const isCoach = (s: StaffOption) => s.staffRole === 'INSTRUCTOR' || !!s.coachLevel;

interface HotelBookingGroup {
  males: HotelBookingEntry[];
  females: HotelBookingEntry[];
  /** persone senza sesso in anagrafica (prima sparivano dalla lista senza avviso) */
  unspecified?: HotelBookingEntry[];
}

/** atleti in males/females/unspecified, allenatori scelti in `coaches`, divisi anch'essi per sesso */
interface HotelBookingList extends HotelBookingGroup {
  coaches?: HotelBookingGroup;
  generatedAt: string;
  totalCount: number;
  /** avvisi del server (sesso non indicato, tesserati non trovati) */
  warnings?: string[];
}

interface ListSection {
  title: string;
  entries: HotelBookingEntry[];
  /** "Nato"/"Nata"/"Nato/a" */
  born: string;
}

interface ListGroup {
  title: string;
  count: number;
  sections: ListSection[];
}

const genderSections = (group?: HotelBookingGroup): ListSection[] =>
  [
    { title: 'Maschi', entries: group?.males ?? [], born: 'Nato' },
    { title: 'Femmine', entries: group?.females ?? [], born: 'Nata' },
    { title: 'Sesso non indicato', entries: group?.unspecified ?? [], born: 'Nato/a' },
  ].filter((section) => section.entries.length > 0);

/** Atleti e allenatori separati, ciascuno diviso per sesso; i gruppi vuoti non compaiono */
const listGroups = (data: HotelBookingList): ListGroup[] =>
  [
    { title: 'Atleti', sections: genderSections(data) },
    { title: 'Allenatori', sections: genderSections(data.coaches) },
  ]
    .map((group) => ({ ...group, count: group.sections.reduce((n, section) => n + section.entries.length, 0) }))
    .filter((group) => group.count > 0);

interface Props {
  open: boolean;
  onClose: () => void;
  memberUuids: string[];
}

export default function HotelBookingModal({ open, onClose, memberUuids }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HotelBookingList | null>(null);
  // primo passo: scelta degli allenatori da aggiungere (solo per chi può vedere lo staff)
  const canSeeStaff = authService.hasCapability('CAN_VIEW_STAFF');
  const [step, setStep] = useState<'coaches' | 'list'>('coaches');
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  const loadStaff = async () => {
    setLoadingStaff(true);
    try {
      const filters = { page: 1, pageSize: 500 };
      const [rows] = await apiService.get<[StaffOption[], number]>(
        `/staff?filters=${encodeURIComponent(JSON.stringify(filters))}`,
      );
      const active = rows.filter((s) => !s.status || s.status === 'ACTIVE');
      active.sort(
        (a, b) =>
          Number(isCoach(b)) - Number(isCoach(a)) ||
          (a.lastName ?? '').localeCompare(b.lastName ?? '') ||
          (a.firstName ?? '').localeCompare(b.firstName ?? ''),
      );
      setStaffOptions(active);
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nel caricamento dello staff'));
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadData = async (staffUuids: string[] = selectedStaff) => {
    if (memberUuids.length === 0) return;

    setLoading(true);
    try {
      const result = await apiService.post<HotelBookingList>('/members/hotel-booking-list', {
        memberUuids,
        staffUuids,
      });
      setData(result);
      setStep('list');
    } catch (error) {
      message.error(getErrorMessage(error, 'Errore nella generazione della lista'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpened = () => {
    setData(null);
    if (canSeeStaff) {
      setStep('coaches');
      loadStaff();
    } else {
      loadData([]);
    }
  };

  const formatDate = (date: string) => {
    return date ? dayjs(date).format('DD/MM/YYYY') : '-';
  };

  const renderEntry = (entry: HotelBookingEntry, index: number, born: string) => (
    <div key={index} className="py-2 border-b last:border-b-0">
      <div className="font-medium">
        {index + 1}. {entry.lastName} {entry.firstName}
      </div>
      <div className="text-gray-500 text-sm">
        {born} il {formatDate(entry.birthDate)} a {entry.birthPlace || '-'}
      </div>
    </div>
  );

  const generateTextList = () => {
    if (!data) return '';

    let text = `LISTA PRENOTAZIONE ALBERGHIERA\n`;
    text += `Generata il: ${dayjs(data.generatedAt).format('DD/MM/YYYY HH:mm')}\n`;
    text += `Totale partecipanti: ${data.totalCount}\n\n`;

    for (const group of listGroups(data)) {
      text += `##### ${group.title.toUpperCase()} (${group.count}) #####\n\n`;
      for (const section of group.sections) {
        text += `=== ${section.title.toUpperCase()} (${section.entries.length}) ===\n`;
        section.entries.forEach((e, i) => {
          text += `${i + 1}. ${e.lastName} ${e.firstName} - ${section.born} il ${formatDate(e.birthDate)} a ${e.birthPlace || '-'}\n`;
        });
        text += '\n';
      }
    }

    return text;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateTextList());
      message.success('Lista copiata negli appunti');
    } catch {
      // permesso negato o pagina non sicura (HTTP): la copia non è avvenuta
      message.error('Copia non riuscita: usa Stampa oppure seleziona il testo a mano');
    }
  };

  // i dati finiscono in HTML scritto a mano: nomi e luoghi vanno sempre escapati
  const esc = (value: unknown) =>
    String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

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
          h1.group { font-size: 16px; margin-top: 28px; border-bottom: 2px solid #333; padding-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>LISTA PRENOTAZIONE ALBERGHIERA</h1>
        <div class="meta">
          Generata il: ${dayjs(data?.generatedAt).format('DD/MM/YYYY HH:mm')}<br/>
          Totale partecipanti: ${data?.totalCount || 0}
        </div>
        
        ${(data ? listGroups(data) : []).map((group) => `
          <h1 class="group">${esc(group.title.toUpperCase())} (${group.count})</h1>
          ${group.sections.map((section) => `
            <h2>${esc(section.title.toUpperCase())} (${section.entries.length})</h2>
            ${section.entries.map((e, i) => `
              <div class="entry">
                <div class="name">${i + 1}. ${esc(e.lastName)} ${esc(e.firstName)}</div>
                <div class="details">${section.born} il ${formatDate(e.birthDate)} a ${esc(e.birthPlace || '-')}</div>
              </div>
            `).join('')}
          `).join('')}
        `).join('')}
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
      footer={
        step === 'coaches'
          ? [
              <Button key="close" onClick={onClose}>
                Annulla
              </Button>,
              <Button key="generate" type="primary" loading={loading} onClick={() => loadData()}>
                Genera lista
              </Button>,
            ]
          : [
              canSeeStaff && (
                <Button key="back" icon={<ArrowLeftOutlined />} onClick={() => setStep('coaches')}>
                  Allenatori
                </Button>
              ),
              <Button key="copy" icon={<CopyOutlined />} onClick={handleCopy} disabled={!data}>
                Copia
              </Button>,
              <Button key="print" icon={<PrinterOutlined />} onClick={handlePrint} disabled={!data}>
                Stampa
              </Button>,
              <Button key="close" type="primary" onClick={onClose}>
                Chiudi
              </Button>,
            ]
      }
      afterOpenChange={(visible) => {
        if (visible) handleOpened();
      }}
    >
      {step === 'coaches' ? (
        <div>
          <Typography.Paragraph type="secondary">
            {memberUuids.length} {memberUuids.length === 1 ? 'atleta selezionato' : 'atleti selezionati'}. Scegli gli
            allenatori da aggiungere alla lista (facoltativo).
          </Typography.Paragraph>
          {loadingStaff ? (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          ) : staffOptions.length === 0 ? (
            <div className="text-center text-gray-400 py-6">Nessun membro dello staff attivo</div>
          ) : (
            <>
              <Space className="mb-3" wrap>
                <Button size="small" onClick={() => setSelectedStaff(staffOptions.filter(isCoach).map((s) => s.uuid))}>
                  Seleziona gli allenatori
                </Button>
                <Button size="small" onClick={() => setSelectedStaff([])} disabled={!selectedStaff.length}>
                  Nessuno
                </Button>
              </Space>
              <Checkbox.Group
                value={selectedStaff}
                onChange={(v) => setSelectedStaff(v as string[])}
                style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
              >
                {staffOptions.map((s) => (
                  <Checkbox key={s.uuid} value={s.uuid}>
                    {s.lastName} {s.firstName}
                    {s.staffRole && (
                      <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                        {staffRoleLabels[s.staffRole] ?? s.staffRole}
                      </Typography.Text>
                    )}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </>
          )}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-8">
          <Spin size="large" />
        </div>
      ) : data ? (
        <div>
          <div className="text-gray-500 mb-4">
            Totale partecipanti: <strong>{data.totalCount}</strong>

          </div>

          {(data.warnings ?? []).map((w) => (
            <Alert key={w} type="warning" showIcon message={w} className="mb-3" />
          ))}

          {listGroups(data).map((group) => (
            <div key={group.title} className="mb-4">
              <Typography.Title level={5} style={{ marginBottom: 0 }}>
                {group.title} ({group.count})
              </Typography.Title>
              {group.sections.map((section) => (
                <div key={section.title}>
                  <Divider orientation="left">
                    {section.title} ({section.entries.length})
                  </Divider>
                  {section.entries.map((entry, index) => renderEntry(entry, index, section.born))}
                </div>
              ))}
            </div>
          ))}

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
