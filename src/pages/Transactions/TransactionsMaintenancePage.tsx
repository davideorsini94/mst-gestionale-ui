import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, App, Button, Card, Col, Grid, Input, InputNumber, Row, Select, Space, Statistic, Table, Tabs, Tag, Tooltip,
  Typography, theme,
} from 'antd';
import { ArrowLeftOutlined, CheckOutlined, ClearOutlined, RollbackOutlined, ToolOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { apiService } from '../../services/ApiService';
import { message } from '../../services/notify';
import { formatEuro, italianStatisticProps, euroInputNumberProps } from '../../helpers/format';

const { useBreakpoint } = Grid;
const { Text, Paragraph } = Typography;

const euro = (v: number | null | undefined) => formatEuro(v);

// ───────────────────────────── Pulizia duplicati ─────────────────────────────

interface DuplicateGroup {
  date: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  subject: string | null;
  total: number;
  keep: number;
  remove: number;
}

interface DuplicatesPreview {
  summary: { groups: number; toRemove: number; withReceipt: number; incomeYears: number[]; archived: number };
  groups: DuplicateGroup[];
  total: number;
}

function DuplicatesTab() {
  // modal da App.useApp(): le conferme seguono il tema (Modal.confirm statico resterebbe chiaro)
  const { modal } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
  const [data, setData] = useState<DuplicatesPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      setData(await apiService.get<DuplicatesPreview>(`/transactions/maintenance/duplicates?page=${p}&pageSize=${ps}`));
      setPage(p);
      setPageSize(ps);
    } catch {
      message.error('Errore nel calcolo dei duplicati');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const remove = () => {
    if (!data) return;
    const { toRemove, withReceipt } = data.summary;
    modal.confirm({
      title: `Rimuovere ${toRemove.toLocaleString('it-IT')} movimenti duplicati?`,
      content: (
        <div>
          <p>I movimenti vengono spostati in un archivio e si possono ripristinare con "Ripristina archivio".</p>
          <p>
            {withReceipt} hanno una ricevuta: numero e PDF restano nell'archivio. Le altre ricevute non vengono
            rinumerate e quei numeri non verranno riassegnati.
          </p>
        </div>
      ),
      okText: 'Rimuovi duplicati',
      okButtonProps: { danger: true },
      cancelText: 'Annulla',
      onOk: async () => {
        setWorking(true);
        try {
          const res = await apiService.post<{ removed: number; receiptsRegenerated: number; errors?: string[] }>(
            '/transactions/maintenance/duplicates/remove',
            { expectedCount: toRemove },
            { timeout: 30 * 60 * 1000 },
          );
          message.success(`${res.removed} duplicati archiviati`);
          await load(1, pageSize);
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Errore nella rimozione');
        } finally {
          setWorking(false);
        }
      },
    });
  };

  const restore = () => {
    modal.confirm({
      title: 'Ripristinare tutti i movimenti archiviati?',
      content: 'I duplicati rimossi tornano tra i movimenti con i loro numeri di ricevuta originali.',
      okText: 'Ripristina',
      cancelText: 'Annulla',
      onOk: async () => {
        setWorking(true);
        try {
          const res = await apiService.post<{ restored: number }>(
            '/transactions/maintenance/duplicates/restore',
            undefined,
            { timeout: 30 * 60 * 1000 },
          );
          message.success(`${res.restored} movimenti ripristinati`);
          await load(1, pageSize);
        } catch (error: any) {
          message.error(error?.response?.data?.message || 'Errore nel ripristino');
        } finally {
          setWorking(false);
        }
      },
    });
  };

  const columns = [
    { title: 'Data', dataIndex: 'date', key: 'date', width: 110, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Tipo', dataIndex: 'type', key: 'type', width: 90,
      render: (t: string) => <Tag color={t === 'INCOME' ? 'green' : 'red'}>{t === 'INCOME' ? 'Entrata' : 'Uscita'}</Tag>,
    },
    { title: 'Soggetto', dataIndex: 'subject', key: 'subject', ellipsis: true, render: (s: string | null) => s || '-' },
    { title: 'Importo salvato', dataIndex: 'amount', key: 'amount', width: 130, align: 'right' as const, render: euro },
    { title: 'Copie', dataIndex: 'total', key: 'total', width: 80, align: 'right' as const },
    { title: 'Si tengono', dataIndex: 'keep', key: 'keep', width: 100, align: 'right' as const },
    {
      title: 'Da rimuovere', dataIndex: 'remove', key: 'remove', width: 120, align: 'right' as const,
      render: (n: number) => <Text strong style={{ color: token.colorErrorText }}>{n}</Text>,
    },
  ];

  const s = data?.summary;
  return (
    <div>
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message="Perché ci sono duplicati"
        description={
          <span>
            Con la versione precedente, reimportando un file Excel le righe con l'importo rovinato non venivano
            riconosciute e venivano inserite di nuovo. Per ogni movimento si tengono tante copie quante erano nel primo
            import in cui compare (righe uguali nello stesso file sono movimenti distinti); le altre sono copie.
            Esegui la pulizia <strong>prima</strong> della revisione degli importi.
          </span>
        }
      />
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={12} md={6}><Card size="small"><Statistic {...italianStatisticProps} title="Gruppi" value={s?.groups ?? 0} loading={loading} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic {...italianStatisticProps} title="Copie da rimuovere" value={s?.toRemove ?? 0} loading={loading} valueStyle={{ color: token.colorErrorText }} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic {...italianStatisticProps} title="Con ricevuta" value={s?.withReceipt ?? 0} loading={loading} /></Card></Col>
        <Col xs={12} md={6}><Card size="small"><Statistic {...italianStatisticProps} title="In archivio" value={s?.archived ?? 0} loading={loading} /></Card></Col>
      </Row>
      <Space wrap className="mb-4">
        <Button danger type="primary" icon={<ClearOutlined />} loading={working} disabled={!s?.toRemove} onClick={remove}>
          Rimuovi duplicati
        </Button>
        <Button icon={<RollbackOutlined />} loading={working} disabled={!s?.archived} onClick={restore}>
          Ripristina archivio
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={data?.groups ?? []}
        rowKey={(g) => `${g.date}-${g.type}-${g.amount}-${g.subject ?? ''}`}
        loading={loading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 800 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: !isMobile,
          pageSizeOptions: ['10', '20', '50', '100'],
          simple: isMobile,
          showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} di ${total}`,
        }}
        onChange={(pag) => load(pag.current ?? 1, pag.pageSize ?? pageSize)}
      />
    </div>
  );
}

// ───────────────────────────── Revisione importi ─────────────────────────────

type Confidence = 'certain' | 'high' | 'check' | 'manual';

interface ReviewItem {
  uuid: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  subject?: string;
  notes?: string;
  notes2?: string;
  budgetItem?: string | null;
  amount: number;
  originalAmount: number | null;
  suggestedAmount: number;
  suggestedOriginalAmount: number | null;
  amountBeforeReview: number | null;
  amountReview: 'CORRECTED' | 'CONFIRMED' | null;
  hasReceipt: boolean;
  receiptNumber?: number;
  confidence: Confidence;
  importBatch: string;
  importBatchStarted: string;
}

interface ReviewResponse {
  items: ReviewItem[];
  total: number;
  counts: Record<Confidence, number>;
  batches: { batch: string; size: number; started: string }[];
}

const confidenceInfo: Record<Confidence, { label: string; color: string; help: string }> = {
  certain: { label: 'Certo', color: 'red', help: 'La stessa riga era stata reimportata più volte: prova sicura del bug' },
  high: { label: 'Alta', color: 'orange', help: 'Da un import successivo al primo' },
  check: { label: 'Da verificare', color: 'gold', help: 'Dal primo import: contiene sia importi piccoli veri sia importi rovinati' },
  manual: { label: 'Inserito a mano', color: 'default', help: 'Probabilmente inserito dalla UI: non toccato dal bug' },
};

function AmountReviewTab() {
  const { modal } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [data, setData] = useState<ReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<'PENDING' | 'CORRECTED' | 'CONFIRMED'>('PENDING');
  const [confidence, setConfidence] = useState<Confidence | undefined>(undefined);
  const [type, setType] = useState<'INCOME' | 'EXPENSE' | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [batch, setBatch] = useState<string | undefined>(undefined);
  const [min, setMin] = useState<number>(1);
  const [max, setMax] = useState<number>(20.99);
  const [subject, setSubject] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  // "Seleziona tutti i risultati": l'azione vale per tutti i movimenti del filtro, non solo per la pagina
  const [allSelected, setAllSelected] = useState(false);
  // valori proposti modificati dall'utente (uuid → importo)
  const [edited, setEdited] = useState<Record<string, number>>({});

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), status, min: String(min), max: String(max) });
    if (confidence) params.set('confidence', confidence);
    if (type) params.set('type', type);
    if (year) params.set('year', String(year));
    if (batch) params.set('batch', batch);
    if (subject.trim()) params.set('subject', subject.trim());
    return params.toString();
  }, [page, pageSize, status, confidence, type, year, batch, min, max, subject]);

  const latestQuery = useRef('');
  const load = async () => {
    const requested = query;
    latestQuery.current = requested;
    setLoading(true);
    try {
      const response = await apiService.get<ReviewResponse>(`/transactions/maintenance/amount-review?${requested}`);
      // filtri cambiati nel frattempo: la risposta è vecchia
      if (latestQuery.current !== requested) return;
      // pagina svuotata (es. corrette tutte le righe dell'ultima pagina): si torna all'ultima pagina con dati
      if (!response.items.length && response.total > 0 && page > 1) {
        setPage(Math.ceil(response.total / pageSize));
        return;
      }
      setData(response);
      setSelected([]);
      setAllSelected(false);
    } catch {
      message.error('Errore nel caricamento');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(load, subject ? 400 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const resetPage = () => setPage(1);
  const items = data?.items ?? [];
  const valueFor = (item: ReviewItem) => edited[item.uuid] ?? item.suggestedAmount;

  const run = async (label: string, action: () => Promise<string>) => {
    setWorking(true);
    try {
      message.success(await action());
      setEdited({});
      await load();
    } catch (error: any) {
      message.error(error?.response?.data?.message || `Errore: ${label}`);
    } finally {
      setWorking(false);
    }
  };

  const total = data?.total ?? 0;
  const currentFilters = () => ({ min, max, year, type, status, confidence, batch, subject: subject.trim() || undefined });

  /** Azioni su TUTTI i risultati del filtro: sempre con avviso e conferma esplicita. */
  const runOnAll = (kind: 'apply' | 'confirm' | 'undo') => {
    const totalLabel = total.toLocaleString('it-IT');
    const texts = {
      apply: {
        title: `Correggere ×1000 tutti i ${totalLabel} movimenti del filtro?`,
        body: (
          <>
            <p>
              L'azione vale per <strong>tutti i {totalLabel} risultati</strong> dei filtri attuali, non solo per le
              righe di questa pagina.
              {confidence !== 'certain' && (
                <> Tra questi possono esserci importi piccoli veri (es. una commissione da 2,50 € diventerebbe 2.500 €).</>
              )}
            </p>
            <p>
              Ogni importo viene moltiplicato per 1000 (i valori che hai modificato in questa pagina hanno la precedenza);
              per le entrate le ricevute vengono rigenerate con lo stesso numero. Può richiedere qualche minuto.
            </p>
            <p>Si può annullare dalla vista "Corretti" selezionando tutti i risultati.</p>
          </>
        ),
        ok: `Correggi ${totalLabel} movimenti`,
        endpoint: 'apply-all',
        done: (r: any) => `${r.corrected} importi corretti${r.errors?.length ? ` (${r.errors.length} errori)` : ''}`,
      },
      confirm: {
        title: `Segnare come corretti tutti i ${totalLabel} movimenti del filtro?`,
        body: <p>Gli importi restano invariati e i movimenti escono dalla lista dei sospetti. Si può annullare dalla vista "Confermati".</p>,
        ok: `Conferma ${totalLabel} movimenti`,
        endpoint: 'confirm-all',
        done: (r: any) => `${r.confirmed} importi confermati come corretti`,
      },
      undo: {
        title: `Annullare la revisione di tutti i ${totalLabel} movimenti del filtro?`,
        body: <p>Gli importi tornano ai valori precedenti la revisione e i movimenti tornano tra quelli da rivedere.</p>,
        ok: `Annulla ${totalLabel} revisioni`,
        endpoint: 'undo-all',
        done: (r: any) => `${r.undone} revisioni annullate`,
      },
    }[kind];

    modal.confirm({
      title: texts.title,
      content: (
        <div>
          <Alert type="warning" showIcon className="mb-3" message="Azione su tutti i risultati del filtro" />
          {texts.body}
        </div>
      ),
      okText: texts.ok,
      okButtonProps: { danger: kind !== 'confirm' },
      cancelText: 'Annulla',
      width: 560,
      onOk: () =>
        run(texts.ok, async () => {
          const res = await apiService.post<any>(
            `/transactions/maintenance/amount-review/${texts.endpoint}`,
            { filters: currentFilters(), expectedTotal: total, ...(kind === 'apply' ? { overrides: edited } : {}) },
            { timeout: 30 * 60 * 1000 },
          );
          return texts.done(res);
        }),
    });
  };

  const applyTo = (uuids: string[]) =>
    run('correzione', async () => {
      const chosen = items.filter((i) => uuids.includes(i.uuid));
      const res = await apiService.post<{ corrected: number; errors: string[] }>(
        '/transactions/maintenance/amount-review/apply',
        {
          items: chosen.map((i) => ({
            uuid: i.uuid,
            amount: valueFor(i),
            originalAmount: i.originalAmount === null ? undefined : i.suggestedOriginalAmount,
          })),
        },
        { timeout: 10 * 60 * 1000 },
      );
      return `${res.corrected} importi corretti${res.errors.length ? ` (${res.errors.length} errori)` : ''}`;
    });

  const confirmOk = (uuids: string[]) =>
    run('conferma', async () => {
      const res = await apiService.post<{ confirmed: number }>('/transactions/maintenance/amount-review/confirm', { uuids });
      return `${res.confirmed} importi confermati come corretti`;
    });

  const undo = (uuids: string[]) =>
    run('annullamento', async () => {
      const res = await apiService.post<{ undone: number }>('/transactions/maintenance/amount-review/undo', { uuids }, { timeout: 10 * 60 * 1000 });
      return `${res.undone} revisioni annullate`;
    });

  const selectedItems = items.filter((i) => selected.includes(i.uuid));
  const uncertainSelected = selectedItems.filter((i) => i.confidence !== 'certain');

  /** Correzione multipla: con movimenti non "Certo" nella selezione si chiede conferma esplicita. */
  const applyBulk = () => {
    if (!uncertainSelected.length) {
      applyTo(selected);
      return;
    }
    const byLevel = (Object.keys(confidenceInfo) as Confidence[])
      .map((c) => ({ c, n: uncertainSelected.filter((i) => i.confidence === c).length }))
      .filter((x) => x.n > 0);
    modal.confirm({
      title: `Correggere ${selectedItems.length} movimenti, di cui ${uncertainSelected.length} non certi?`,
      content: (
        <div>
          <p>
            Tra i selezionati ci sono movimenti per cui non è sicuro che l'importo sia stato rovinato dall'import:{' '}
            {byLevel.map((x, k) => (
              <span key={x.c}>
                {k > 0 && ', '}
                <strong>{x.n}</strong> "{confidenceInfo[x.c].label}"
              </span>
            ))}
            .
          </p>
          <p>
            Un importo piccolo vero (es. una commissione da 2,50 €) diventerebbe 2.500 €. Controlla le righe prima di
            confermare: ogni correzione si può comunque annullare dalla vista "Corretti".
          </p>
        </div>
      ),
      okText: `Correggi ${selectedItems.length} movimenti`,
      okButtonProps: { danger: true },
      cancelText: 'Annulla',
      onOk: () => applyTo(selected),
    });
  };

  const columns = [
    { title: 'Data', dataIndex: 'date', key: 'date', width: 105, render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
    {
      title: 'Tipo', dataIndex: 'type', key: 'type', width: 85,
      render: (t: string) => <Tag color={t === 'INCOME' ? 'green' : 'red'}>{t === 'INCOME' ? 'Entrata' : 'Uscita'}</Tag>,
    },
    {
      title: 'Soggetto / note', key: 'subject', ellipsis: true,
      render: (_: unknown, i: ReviewItem) => (
        <div style={{ minWidth: 0 }}>
          <div className="truncate">{i.subject || '-'}</div>
          <Text type="secondary" className="text-xs truncate block">
            {[i.notes, i.notes2, i.budgetItem].filter(Boolean).join(' · ') || ' '}
          </Text>
        </div>
      ),
    },
    {
      title: 'Confidenza', dataIndex: 'confidence', key: 'confidence', width: 130,
      render: (c: Confidence) => (
        <Tooltip title={confidenceInfo[c].help}><Tag color={confidenceInfo[c].color}>{confidenceInfo[c].label}</Tag></Tooltip>
      ),
    },
    { title: status === 'CORRECTED' ? 'Prima' : 'Importo salvato', key: 'amount', width: 125, align: 'right' as const,
      render: (_: unknown, i: ReviewItem) => euro(status === 'CORRECTED' ? i.amountBeforeReview : i.amount) },
    status === 'PENDING'
      ? {
          title: 'Proposta (×1000)', key: 'suggested', width: 170,
          render: (_: unknown, i: ReviewItem) => (
            <InputNumber
              size="small"
              min={0.01}
              precision={2}
              value={valueFor(i)}
              onChange={(v) => setEdited((prev) => ({ ...prev, [i.uuid]: Number(v) }))}
              style={{ width: '100%' }}
              aria-label="Importo corretto"
              {...euroInputNumberProps}
            />
          ),
        }
      : { title: 'Attuale', key: 'current', width: 125, align: 'right' as const, render: (_: unknown, i: ReviewItem) => euro(i.amount) },
    {
      title: '', key: 'actions', width: 130, fixed: 'right' as const,
      render: (_: unknown, i: ReviewItem) =>
        status === 'PENDING' ? (
          <Space size="small">
            <Tooltip title="Applica la correzione"><Button size="small" type="primary" icon={<ToolOutlined />} aria-label="Applica correzione" disabled={working} onClick={() => applyTo([i.uuid])} /></Tooltip>
            <Tooltip title="L'importo è giusto"><Button size="small" icon={<CheckOutlined />} aria-label="Importo corretto" disabled={working} onClick={() => confirmOk([i.uuid])} /></Tooltip>
          </Space>
        ) : (
          <Tooltip title="Annulla la revisione"><Button size="small" icon={<UndoOutlined />} aria-label="Annulla revisione" disabled={working} onClick={() => undo([i.uuid])}>Annulla</Button></Tooltip>
        ),
    },
  ];

  const years = Array.from({ length: new Date().getFullYear() - 2016 }, (_, k) => new Date().getFullYear() - k);

  return (
    <div>
      <Alert
        type="warning"
        showIcon
        className="mb-4"
        message="Importi rovinati dal vecchio import Excel"
        description={
          <Paragraph className="mb-0">
            Gli importi da 1.000 € in su mostrati con il separatore delle migliaia (es. "5,560.00") venivano salvati
            divisi per mille e troncati (5,56 €). La proposta ×1000 è una <strong>stima</strong>: le unità e i centesimi
            originali sono andati persi, verifica con l'estratto conto o con la documentazione prima di applicare.
            Le correzioni si possono annullare; per le entrate la ricevuta viene rigenerata con lo stesso numero.
          </Paragraph>
        }
      />

      <div className={`flex ${isMobile ? 'flex-col' : 'flex-wrap items-end'} gap-3 mb-3`}>
        <Select value={status} onChange={(v) => { setStatus(v); resetPage(); }} style={{ width: isMobile ? '100%' : 170 }}
          options={[{ value: 'PENDING', label: 'Da rivedere' }, { value: 'CORRECTED', label: 'Corretti' }, { value: 'CONFIRMED', label: 'Confermati' }]} />
        <Select allowClear placeholder="Confidenza" value={confidence} onChange={(v) => { setConfidence(v); resetPage(); }} style={{ width: isMobile ? '100%' : 180 }}
          options={(Object.keys(confidenceInfo) as Confidence[]).map((c) => ({
            value: c, label: `${confidenceInfo[c].label}${data ? ` (${data.counts[c]})` : ''}`,
          }))} />
        <Select allowClear placeholder="Tipo" value={type} onChange={(v) => { setType(v); resetPage(); }} style={{ width: isMobile ? '100%' : 120 }}
          options={[{ value: 'INCOME', label: 'Entrate' }, { value: 'EXPENSE', label: 'Uscite' }]} />
        <Select allowClear placeholder="Anno" value={year} onChange={(v) => { setYear(v); resetPage(); }} style={{ width: isMobile ? '100%' : 110 }}
          options={years.map((y) => ({ value: y, label: String(y) }))} />
        <Select allowClear placeholder="Lotto di import" value={batch} onChange={(v) => { setBatch(v); resetPage(); }} style={{ width: isMobile ? '100%' : 230 }}
          options={(data?.batches ?? []).map((b) => ({ value: b.batch, label: `${dayjs(b.started.replace(' ', 'T')).format('DD/MM/YYYY HH:mm')} (${b.size} righe)` }))} />
        {status === 'PENDING' && (
          <Space.Compact>
            <InputNumber value={min} min={0} precision={2} {...euroInputNumberProps} onChange={(v) => { setMin(Number(v ?? 0)); resetPage(); }} aria-label="Importo minimo" addonBefore="da €" style={{ width: 140 }} />
            <InputNumber value={max} min={0} precision={2} {...euroInputNumberProps} onChange={(v) => { setMax(Number(v ?? 0)); resetPage(); }} aria-label="Importo massimo" addonBefore="a €" style={{ width: 140 }} />
          </Space.Compact>
        )}
        <Input placeholder="Cerca soggetto..." allowClear value={subject} onChange={(e) => { setSubject(e.target.value); resetPage(); }} style={{ width: isMobile ? '100%' : 200 }} />
        <div className={isMobile ? '' : 'ml-auto'}><Tag color="blue">Totale: {data?.total ?? 0}</Tag></div>
      </div>

      {status === 'PENDING' && (
        <Space wrap className="mb-3">
          <Tooltip title={!allSelected && uncertainSelected.length ? `${uncertainSelected.length} movimenti selezionati non sono "Certo": verrà chiesta conferma` : ''}>
            <Button type="primary" icon={<ToolOutlined />} disabled={!selected.length || working} loading={working}
              onClick={() => (allSelected ? runOnAll('apply') : applyBulk())}>
              Applica correzione ai selezionati ({allSelected ? total.toLocaleString('it-IT') : selected.length})
            </Button>
          </Tooltip>
          <Button icon={<CheckOutlined />} disabled={!selected.length || working}
            onClick={() => (allSelected ? runOnAll('confirm') : confirmOk(selected))}>
            Segna come corretti ({allSelected ? total.toLocaleString('it-IT') : selected.length})
          </Button>
        </Space>
      )}
      {status !== 'PENDING' && (
        <Space wrap className="mb-3">
          <Button icon={<UndoOutlined />} disabled={!selected.length || working} loading={working}
            onClick={() => (allSelected ? runOnAll('undo') : undo(selected))}>
            Annulla revisione dei selezionati ({allSelected ? total.toLocaleString('it-IT') : selected.length})
          </Button>
        </Space>
      )}

      {items.length > 0 && selected.length === items.length && total > items.length && (
        <Alert
          className="mb-3"
          type={allSelected ? 'warning' : 'info'}
          showIcon
          message={
            allSelected ? (
              <span>
                Selezionati <strong>tutti i {total.toLocaleString('it-IT')} risultati</strong> del filtro (non solo questa
                pagina): le azioni varranno per tutti.{' '}
                <Button type="link" size="small" onClick={() => { setAllSelected(false); setSelected([]); }}>
                  Annulla selezione
                </Button>
              </span>
            ) : (
              <span>
                Selezionati i {items.length} movimenti di questa pagina.{' '}
                <Button type="link" size="small" onClick={() => setAllSelected(true)}>
                  Seleziona tutti i {total.toLocaleString('it-IT')} risultati
                </Button>
              </span>
            )
          }
        />
      )}
      <Table
        columns={columns}
        dataSource={items}
        rowKey="uuid"
        loading={loading}
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: 1000 }}
        rowSelection={{
          selectedRowKeys: selected,
          onChange: (keys) => {
            setSelected(keys as string[]);
            // togliendo anche una sola riga si esce da "tutti i risultati"
            if (keys.length < items.length) setAllSelected(false);
          },
        }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: !isMobile,
          pageSizeOptions: ['10', '20', '50', '100'],
          simple: isMobile,
          showTotal: isMobile ? undefined : (total, range) => `${range[0]}-${range[1]} di ${total}`,
        }}
        onChange={(pag) => { setPage(pag.current ?? 1); setPageSize(pag.pageSize ?? pageSize); }}
      />
    </div>
  );
}

export default function TransactionsMaintenancePage() {
  const navigate = useNavigate();
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/transactions')} aria-label="Torna ai movimenti" />
        <h1 className="text-xl md:text-2xl font-bold m-0">Manutenzione dati movimenti</h1>
      </div>
      <Tabs
        defaultActiveKey="duplicates"
        items={[
          { key: 'duplicates', label: '1. Pulizia duplicati', children: <DuplicatesTab /> },
          { key: 'review', label: '2. Revisione importi', children: <AmountReviewTab /> },
        ]}
      />
    </div>
  );
}
