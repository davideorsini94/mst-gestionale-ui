import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Empty, Segmented, theme } from 'antd';
import { useThemePrefs } from '../../theme/ThemeProvider';
import { formatEuro } from '../../helpers/format';

export interface MonthRow {
  /** 'YYYY-MM' */
  month: string;
  income: number;
  expense: number;
}

type Granularity = 'month' | 'year';

interface Bucket {
  key: string;
  /** etichetta asse X */
  label: string;
  /** seconda riga dell'etichetta (anno sotto gennaio / primo mese) */
  subLabel?: string;
  /** titolo del tooltip */
  title: string;
  income: number;
  expense: number;
}

/**
 * Colori delle serie (validati con il controllo daltonismi del dataviz: entrambe le modalità passano).
 * Verde/rosso non è distinguibile per i deuteranopi (ΔE 5,5), per questo entrate = blu del club.
 */
const SERIES = {
  light: { income: '#2a78d6', expense: '#e34948' },
  dark: { income: '#3987e5', expense: '#e66767' },
} as const;

const MONTHS_SHORT = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const MONTHS_LONG = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

/** Oltre questo numero di mesi la vista predefinita è per anno. */
const AUTO_YEAR_THRESHOLD = 24;
const BAR_MAX = 24;
const PAIR_GAP = 2;
const RADIUS = 4;
const PLOT_TOP = 12;
const X_AXIS_HEIGHT = 34;

const axisFormatter = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' as unknown as boolean });
const formatAxis = (v: number) => {
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${(v / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} Mln`;
  return axisFormatter.format(v);
};

/** Passo "bello" (1, 2, 2.5, 5 × 10^n) per circa `count` intervalli. */
function niceStep(range: number, count: number): number {
  if (range <= 0) return 1;
  const raw = range / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return nice * pow;
}

function buildBuckets(rows: MonthRow[], granularity: Granularity): Bucket[] {
  const valid = rows.filter((r) => /^\d{4}-\d{2}$/.test(r.month));
  if (valid.length === 0) return [];
  const byKey = new Map(valid.map((r) => [r.month, r]));
  const sorted = [...valid].sort((a, b) => a.month.localeCompare(b.month));
  const [y0, m0] = sorted[0].month.split('-').map(Number);
  const [y1, m1] = sorted[sorted.length - 1].month.split('-').map(Number);

  if (granularity === 'year') {
    const out: Bucket[] = [];
    for (let y = y0; y <= y1; y++) {
      let income = 0;
      let expense = 0;
      for (const r of valid) {
        if (r.month.startsWith(`${y}-`)) {
          income += Number(r.income) || 0;
          expense += Number(r.expense) || 0;
        }
      }
      out.push({ key: String(y), label: String(y), title: String(y), income, expense });
    }
    return out;
  }

  // mesi consecutivi: i mesi senza movimenti compaiono vuoti invece di sparire
  const out: Bucket[] = [];
  for (let y = y0, m = m0; y < y1 || (y === y1 && m <= m1); m === 12 ? (y++, (m = 1)) : m++) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    const row = byKey.get(key);
    out.push({
      key,
      label: MONTHS_SHORT[m - 1],
      subLabel: m === 1 || out.length === 0 ? String(y) : undefined,
      title: `${MONTHS_LONG[m - 1]} ${y}`,
      income: Number(row?.income) || 0,
      expense: Number(row?.expense) || 0,
    });
  }
  return out;
}

/** Barra con l'estremità dei dati arrotondata e la base piatta sulla linea dello zero. */
function barPath(x: number, w: number, yZero: number, yValue: number): string {
  const h = Math.abs(yZero - yValue);
  if (h < 0.5) return '';
  const r = Math.min(RADIUS, w / 2, h);
  if (yValue <= yZero) {
    // verso l'alto
    return `M${x},${yZero}V${yValue + r}Q${x},${yValue} ${x + r},${yValue}H${x + w - r}Q${x + w},${yValue} ${x + w},${yValue + r}V${yZero}Z`;
  }
  // valore negativo: verso il basso
  return `M${x},${yZero}V${yValue - r}Q${x},${yValue} ${x + r},${yValue}H${x + w - r}Q${x + w},${yValue} ${x + w},${yValue - r}V${yZero}Z`;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface Props {
  byMonth: MonthRow[];
  isMobile: boolean;
}

/**
 * Entrate e uscite affiancate per mese (o per anno) su un'unica scala.
 * La tabella "Andamento Mensile" sotto è la vista tabellare degli stessi dati.
 */
export default function IncomeExpenseChart({ byMonth, isMobile }: Props) {
  const { token } = theme.useToken();
  const { resolved } = useThemePrefs();
  const colors = SERIES[resolved];

  const monthsCount = byMonth.length;
  const [choice, setChoice] = useState<Granularity | null>(null);
  const autoGranularity: Granularity = useMemo(() => {
    if (monthsCount === 0) return 'month';
    const months = buildBuckets(byMonth, 'month').length;
    return months > AUTO_YEAR_THRESHOLD ? 'year' : 'month';
  }, [byMonth, monthsCount]);
  const granularity = choice ?? autoGranularity;

  const buckets = useMemo(() => buildBuckets(byMonth, granularity), [byMonth, granularity]);
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => setActive(null), [buckets]);

  const [containerRef, containerWidth] = useElementWidth<HTMLDivElement>();
  const scrollRef = useRef<HTMLDivElement>(null);

  const plotHeight = isMobile ? 200 : 240;
  const totalHeight = PLOT_TOP + plotHeight + X_AXIS_HEIGHT;

  // scala Y: sempre comprende lo zero
  const { ticks, yMin, yMax } = useMemo(() => {
    let max = 0;
    let min = 0;
    for (const b of buckets) {
      max = Math.max(max, b.income, b.expense);
      min = Math.min(min, b.income, b.expense);
    }
    if (max === 0 && min === 0) max = 1;
    const step = niceStep(max - min, 4);
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const t: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) t.push(Math.round(v * 100) / 100);
    return { ticks: t, yMin: lo, yMax: hi };
  }, [buckets]);

  const axisWidth = Math.max(...ticks.map((t) => formatAxis(t).length)) * 6.6 + 10;
  const plotAvail = Math.max(0, containerWidth - axisWidth);
  const minGroup = isMobile ? 30 : 36;
  const groupWidth = buckets.length ? Math.max(minGroup, plotAvail / buckets.length) : 0;
  const plotWidth = Math.max(plotAvail, groupWidth * buckets.length);
  const barWidth = Math.max(4, Math.min(BAR_MAX, (groupWidth * 0.62 - PAIR_GAP) / 2));

  const y = (v: number) => PLOT_TOP + ((yMax - v) / (yMax - yMin || 1)) * plotHeight;
  const yZero = y(0);

  // con lo scorrimento orizzontale si parte dai periodi più recenti (a destra)
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [plotWidth, buckets]);

  const indexFromPointer = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - rect.left) / groupWidth);
    return i >= 0 && i < buckets.length ? i : null;
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (!buckets.length) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      const next = active === null ? (delta > 0 ? 0 : buckets.length - 1) : Math.min(buckets.length - 1, Math.max(0, active + delta));
      setActive(next);
      // tiene visibile la colonna selezionata
      const el = scrollRef.current;
      if (el) {
        const x = next * groupWidth;
        if (x < el.scrollLeft) el.scrollLeft = x;
        else if (x + groupWidth > el.scrollLeft + el.clientWidth) el.scrollLeft = x + groupWidth - el.clientWidth;
      }
    } else if (e.key === 'Escape') {
      setActive(null);
    }
  };

  const activeBucket = active !== null ? buckets[active] : null;
  const scrollLeft = scrollRef.current?.scrollLeft ?? 0;
  const tooltipWidth = 208;
  // il tooltip sta di fianco alla colonna selezionata (mai sopra le sue barre), dal lato con più spazio
  let tooltipLeft = 0;
  if (activeBucket) {
    const colLeft = axisWidth + active! * groupWidth - scrollLeft;
    const colRight = colLeft + groupWidth;
    const fitsRight = colRight + 8 + tooltipWidth <= containerWidth;
    const fitsLeft = colLeft - 8 - tooltipWidth >= 0;
    const preferRight = colLeft + groupWidth / 2 < containerWidth / 2;
    tooltipLeft =
      (preferRight && fitsRight) || !fitsLeft
        ? colRight + 8
        : colLeft - 8 - tooltipWidth;
    tooltipLeft = Math.min(Math.max(0, tooltipLeft), Math.max(0, containerWidth - tooltipWidth));
  }

  const totals = useMemo(
    () => buckets.reduce((acc, b) => ({ income: acc.income + b.income, expense: acc.expense + b.expense }), { income: 0, expense: 0 }),
    [buckets],
  );
  const ariaLabel = buckets.length
    ? `Grafico a colonne di entrate e uscite per ${granularity === 'year' ? 'anno' : 'mese'}, da ${buckets[0].title} a ${buckets[buckets.length - 1].title}. ` +
      `Totale entrate ${formatEuro(totals.income)}, totale uscite ${formatEuro(totals.expense)}. Usa le frecce per scorrere i periodi.`
    : 'Nessun dato';

  const legendItem = (color: string, label: string) => (
    <span className="mst-chart-legend-item">
      <span className="mst-chart-swatch" style={{ background: color }} aria-hidden />
      {label}
    </span>
  );

  return (
    <div className="mst-chart">
      <div className="mst-chart-header">
        <div className="mst-chart-legend">
          {legendItem(colors.income, 'Entrate')}
          {legendItem(colors.expense, 'Uscite')}
        </div>
        <Segmented<Granularity>
          size="small"
          value={granularity}
          onChange={(v) => setChoice(v)}
          options={[
            { label: 'Mesi', value: 'month' },
            { label: 'Anni', value: 'year' },
          ]}
        />
      </div>

      <div ref={containerRef} className="mst-chart-body" style={{ height: totalHeight }}>
        {buckets.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nessun movimento nel periodo" />
        ) : containerWidth > 0 ? (
          <>
            {/* asse Y fisso: resta visibile durante lo scorrimento */}
            <svg width={axisWidth} height={totalHeight} className="mst-chart-axis" aria-hidden>
              {ticks.map((t) => (
                <text
                  key={t}
                  x={axisWidth - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  fill={token.colorTextTertiary}
                  fontSize={11}
                >
                  {formatAxis(t)}
                </text>
              ))}
            </svg>

            <div ref={scrollRef} className="mst-chart-scroll" onScroll={() => active !== null && setActive(null)}>
              <svg
                key={`${granularity}-${buckets.length}-${buckets[0]?.key}`}
                width={plotWidth}
                height={totalHeight}
                role="img"
                aria-label={ariaLabel}
                tabIndex={0}
                className="mst-chart-plot"
                onPointerMove={(e) => e.pointerType === 'mouse' && setActive(indexFromPointer(e))}
                onPointerDown={(e) => {
                  const i = indexFromPointer(e);
                  setActive((cur) => (e.pointerType !== 'mouse' && cur === i ? null : i));
                }}
                onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
                onKeyDown={onKeyDown}
                onBlur={() => setActive(null)}
              >
                {/* griglia: linee sottili e continue */}
                {ticks.map((t) => (
                  <line
                    key={t}
                    x1={0}
                    x2={plotWidth}
                    y1={y(t)}
                    y2={y(t)}
                    stroke={t === 0 ? token.colorBorder : token.colorBorderSecondary}
                    strokeWidth={1}
                    shapeRendering="crispEdges"
                  />
                ))}

                {active !== null && (
                  <rect
                    x={active * groupWidth + 2}
                    y={PLOT_TOP}
                    width={groupWidth - 4}
                    height={plotHeight}
                    rx={6}
                    fill={token.colorFillTertiary}
                  />
                )}

                {buckets.map((b, i) => {
                  const cx = i * groupWidth + groupWidth / 2;
                  const xIncome = cx - PAIR_GAP / 2 - barWidth;
                  const xExpense = cx + PAIR_GAP / 2;
                  const dim = active !== null && active !== i;
                  return (
                    <g key={b.key} className="mst-chart-group" style={{ opacity: dim ? 0.45 : 1 }}>
                      <path d={barPath(xIncome, barWidth, yZero, y(b.income))} fill={colors.income} className="mst-chart-bar" />
                      <path d={barPath(xExpense, barWidth, yZero, y(b.expense))} fill={colors.expense} className="mst-chart-bar" />
                      <text
                        x={cx}
                        y={PLOT_TOP + plotHeight + 16}
                        textAnchor="middle"
                        fontSize={11}
                        fill={active === i ? token.colorText : token.colorTextTertiary}
                        fontWeight={active === i ? 600 : 400}
                      >
                        {b.label}
                      </text>
                      {b.subLabel && (
                        <text x={cx} y={PLOT_TOP + plotHeight + 30} textAnchor="middle" fontSize={10} fill={token.colorTextTertiary}>
                          {b.subLabel}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {activeBucket && (
              <div
                className="mst-chart-tooltip"
                style={{ left: tooltipLeft, width: tooltipWidth }}
                role="status"
                aria-live="polite"
              >
                <div className="mst-chart-tooltip-title">{activeBucket.title}</div>
                <div className="mst-chart-tooltip-row">
                  <span className="mst-chart-swatch" style={{ background: colors.income }} aria-hidden />
                  <span>Entrate</span>
                  <span className="mst-chart-tooltip-value">{formatEuro(activeBucket.income)}</span>
                </div>
                <div className="mst-chart-tooltip-row">
                  <span className="mst-chart-swatch" style={{ background: colors.expense }} aria-hidden />
                  <span>Uscite</span>
                  <span className="mst-chart-tooltip-value">{formatEuro(activeBucket.expense)}</span>
                </div>
                <div className="mst-chart-tooltip-row mst-chart-tooltip-total">
                  <span />
                  <span>Bilancio</span>
                  <span className="mst-chart-tooltip-value">{formatEuro(activeBucket.income - activeBucket.expense)}</span>
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
