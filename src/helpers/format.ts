/** Formattazione all'italiana: 1.234,56 (punto per le migliaia, virgola per i decimali). */
const euroFormatter = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  // in italiano Intl non raggruppa i numeri a 4 cifre (5560,00): sempre il punto delle migliaia (5.560,00)
  useGrouping: 'always' as unknown as boolean,
});

export const formatEuro = (value: number | string | null | undefined): string =>
  value === null || value === undefined || value === '' ? '-' : euroFormatter.format(Number(value));

/** Props per <Statistic> con separatori italiani. */
export const italianStatisticProps = { groupSeparator: '.', decimalSeparator: ',' } as const;

/**
 * Importo scritto all'italiana → numero. Il punto è il separatore delle migliaia ("1.000" = mille, "1.234,56"),
 * la virgola quello dei decimali; senza virgola un punto seguito da 1-2 cifre è un decimale ("12.5", "12.50").
 * Restituisce undefined se il testo non è un importo.
 */
export function parseItalianAmount(text: string | number | null | undefined): number | undefined {
  if (text === null || text === undefined) return undefined;
  if (typeof text === 'number') return Number.isFinite(text) ? text : undefined;
  let s = text.replace(/[€\s ]/g, '');
  if (!s) return undefined;
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  if (s.includes(',') && s.includes('.') && s.lastIndexOf('.') > s.lastIndexOf(',')) {
    // incollato all'inglese: "1,000.50"
    s = s.replace(/,/g, '');
  } else if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  if (!/^\d*\.?\d*$/.test(s) || s === '.' ) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? (negative ? -n : n) : undefined;
}

const amountDisplay = new Intl.NumberFormat('it-IT', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: 'always' as unknown as boolean,
});

/**
 * Props per <InputNumber> degli importi in euro: mostra "1.234,56" e interpreta ciò che si scrive all'italiana.
 * (decimalSeparator="," da solo leggeva "1.000" come 1,00 e "1.234,56" come 1,23.)
 */
export const euroInputNumberProps = {
  formatter: (value: number | string | undefined, info: { userTyping: boolean; input: string }) => {
    if (info.userTyping) return info.input;
    if (value === undefined || value === null || value === '') return '';
    const n = Number(value);
    return Number.isFinite(n) ? amountDisplay.format(n) : String(value);
  },
  parser: (text: string | undefined) => {
    const n = parseItalianAmount(text);
    return (n === undefined ? '' : String(n)) as unknown as number;
  },
};
