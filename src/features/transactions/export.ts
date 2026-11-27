/**
 * Movements as a CSV file Excel, Numbers and Google Sheets open as-is (pure).
 *
 * UTF-8 with BOM so Excel shows accents, CRLF line endings, comma separator and
 * a plain decimal point. Amounts are signed (expenses negative) so a column sum
 * gives the balance; transfers stay positive since they move money between accounts.
 */
import { TRANSACTION_KINDS, type TransactionKind } from './constants';

type ExportAccount = { name: string; institution: string | null } | null;

export type ExportableTransaction = {
  occurred_on: string;
  kind: TransactionKind;
  amount: number;
  description: string | null;
  category: string | null;
  installment_months: number | null;
  account: ExportAccount;
  to_account?: ExportAccount;
};

const HEADERS = [
  'Fecha',
  'Tipo',
  'Descripción',
  'Categoría',
  'Cuenta',
  'Cuenta destino',
  'Monto',
  'Meses sin intereses',
];

/**
 * Quotes a text cell when needed and neutralizes formulas: a cell starting with
 * `=`, `+`, `-` or `@` would run as a formula when opened in a spreadsheet.
 */
export function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function signedAmount(t: Pick<ExportableTransaction, 'kind' | 'amount'>) {
  return t.kind === 'expense' ? -t.amount : t.amount;
}

/** `hiddenAccountLabel` names an account RLS hides (a partner's personal one). */
export function transactionsToCsv(
  rows: ExportableTransaction[],
  hiddenAccountLabel = 'Cuenta de tu pareja',
) {
  const account = (a: ExportAccount) =>
    a ? [a.institution, a.name].filter(Boolean).join(' · ') : hiddenAccountLabel;

  const lines = rows.map((t) =>
    [
      t.occurred_on,
      csvCell(TRANSACTION_KINDS[t.kind].label),
      csvCell(t.description ?? ''),
      csvCell(t.category ?? ''),
      csvCell(account(t.account)),
      t.kind === 'transfer' ? csvCell(account(t.to_account ?? null)) : '',
      // Numbers aren't escaped: a leading "-" is the sign, not a formula.
      signedAmount(t).toFixed(2),
      t.installment_months ? String(t.installment_months) : '',
    ].join(','),
  );
  return `\uFEFF${[HEADERS.map(csvCell).join(','), ...lines].join('\r\n')}\r\n`;
}

/** E.g. `kinetik-movimientos-2026-11.csv`; `label` is the month or "historial". */
export function exportFileName(label: string) {
  return `kinetik-movimientos-${label}.csv`;
}
