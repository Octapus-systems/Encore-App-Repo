export function gbp(value) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(Number(value || 0));
}

export function ukDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function ukTime(value, format = '24h') {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const options = format === '12h'
    ? { hour: 'numeric', minute: '2-digit', hour12: true }
    : { hour: '2-digit', minute: '2-digit', hour12: false };
  return new Intl.DateTimeFormat('en-GB', options).format(date);
}