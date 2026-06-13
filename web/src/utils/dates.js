/** Normalize API date (YYYY-MM-DD or ISO datetime) to YYYY-MM-DD. */
export function toISODateString(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

export function formatDateHeading(iso) {
  const d = new Date(`${toISODateString(iso)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatDateLabel(iso) {
  const d = new Date(`${toISODateString(iso)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTimeLabel(time) {
  const [h, m] = String(time).split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateMedium(iso) {
  const d = new Date(`${toISODateString(iso)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return 'Invalid date';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatConsultationSlot(date, time) {
  const dateLabel = formatDateMedium(date);
  const timeLabel = formatTimeLabel(time);
  if (dateLabel === 'Invalid date') return timeLabel || '—';
  return `${dateLabel} · ${timeLabel}`;
}
