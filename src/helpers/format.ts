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
