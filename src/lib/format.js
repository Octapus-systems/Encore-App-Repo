export { gbp } from '@/lib/ukFormat';

const TZ = 'Europe/London';

/** SQLite datetime('now') values are UTC without a zone marker — read them as UTC. */
export function parseDate(v) {
  if (v instanceof Date) return v;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(v)) return new Date(`${v.replace(' ', 'T')}Z`);
  return new Date(v);
}

export function dateTime(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(parseDate(v));
}
export function shortDateTime(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(parseDate(v));
}
export function dateOnly(v) {
  if (!v) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: TZ }).format(parseDate(v));
}
export function timeOnly(v) {
  if (!v) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(parseDate(v));
}
export function relative(v) {
  if (!v) return '';
  const diff = (parseDate(v).getTime() - Date.now()) / 60000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' });
  if (abs < 60) return rtf.format(Math.round(diff), 'minute');
  if (abs < 60 * 24) return rtf.format(Math.round(diff / 60), 'hour');
  return rtf.format(Math.round(diff / 1440), 'day');
}
/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(v) {
  if (!v) return '';
  const d = parseDate(v);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const JOURNEY_TYPES = {
  point_to_point: 'Point to point',
  airport: 'Airport transfer',
  return: 'Return journey',
  event: 'Event chauffeur',
  corporate: 'Corporate travel',
  hourly: 'Hourly / as directed',
};

// Customer-facing wording keeps "pending" requests clearly distinct from confirmed bookings.
export const STATUS = {
  pending: { label: 'Request received', admin: 'Pending', tone: 'amber' },
  under_review: { label: 'Under review', admin: 'Under review', tone: 'amber' },
  clarification_needed: { label: 'Details needed', admin: 'Awaiting clarification', tone: 'amber' },
  quote_sent: { label: 'Quotation ready', admin: 'Quote sent', tone: 'blue' },
  change_requested: { label: 'Change requested', admin: 'Change requested', tone: 'amber' },
  quote_accepted: { label: 'Accepted · awaiting confirmation', admin: 'Quote accepted — confirm', tone: 'blue' },
  quote_declined: { label: 'Quotation declined', admin: 'Quote declined', tone: 'grey' },
  confirmed: { label: 'Confirmed', admin: 'Confirmed — assign', tone: 'green' },
  driver_assigned: { label: 'Chauffeur assigned', admin: 'Assigned', tone: 'green' },
  on_the_way: { label: 'Chauffeur on the way', admin: 'On the way', tone: 'brand' },
  arrived: { label: 'Chauffeur arrived', admin: 'Arrived', tone: 'brand' },
  started: { label: 'Journey in progress', admin: 'Started', tone: 'brand' },
  completed: { label: 'Completed', admin: 'Completed', tone: 'dark' },
  closed: { label: 'Completed', admin: 'Closed', tone: 'grey' },
  rejected: { label: 'Not accepted', admin: 'Rejected', tone: 'red' },
  cancelled_customer: { label: 'Cancelled', admin: 'Cancelled by customer', tone: 'red' },
  cancelled_management: { label: 'Cancelled by Encore', admin: 'Cancelled by management', tone: 'red' },
  expired: { label: 'Expired', admin: 'Expired', tone: 'grey' },
  no_show: { label: 'No-show', admin: 'No-show', tone: 'red' },
};

export const BOOKING_STATUS_OPTIONS = Object.keys(STATUS);

export const LEG_STATUS = {
  unassigned: 'Awaiting assignment',
  assigned: 'Assigned',
  on_the_way: 'On the way',
  arrived: 'Arrived',
  started: 'Started',
  completed: 'Completed',
};

export const PAYMENT_STATUS = {
  unpaid: { label: 'Unpaid', tone: 'amber' },
  link_sent: { label: 'Payment link sent', tone: 'blue' },
  deposit_paid: { label: 'Deposit paid', tone: 'blue' },
  paid: { label: 'Paid', tone: 'green' },
  invoiced: { label: 'Invoiced', tone: 'blue' },
  overdue: { label: 'Overdue', tone: 'red' },
};

export const PAYMENT_ARRANGEMENT = {
  pay_before: 'Pay before journey',
  pay_after: 'Pay after journey',
  corporate_account: 'Corporate account',
  external: 'Paid externally (cash / other)',
};

export const PAYMENT_METHOD = {
  card_link: 'Card via payment link',
  card_terminal: 'Card terminal',
  cash: 'Cash',
  bank_transfer: 'Bank transfer',
  external: 'External / other',
  invoice: 'Invoice settlement',
};

export const ACTIVITY_LABEL = (a) => a.replace(/_/g, ' ');

export function miles(m) {
  if (m == null) return null;
  const mi = m / 1609.344;
  return `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
}
export function driveTime(s) {
  if (s == null) return null;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
}
