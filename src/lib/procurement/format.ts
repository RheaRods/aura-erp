// Formatting helpers used across the Procurement tabs.

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** e.g. "12 Mar 2026". Returns "—" for empty/invalid values. */
export function formatDate(value: DateInput): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** e.g. "12 Mar 2026, 03:45 PM". */
export function formatDateTime(value: DateInput): string {
  const d = toDate(value);
  if (!d) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** e.g. "₹1,25,000.00". Change the default currency here if needed. */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'INR'
): string {
  const n = Number(amount);
  if (amount === null || amount === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

/** e.g. "1,25,000". */
export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value);
  if (value === null || value === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-IN').format(n);
}

/** "partially_received" -> "Partially Received". */
export function formatStatus(status: string | null | undefined): string {
  if (!status) return '—';
  return status
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}