export function adminHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };
}

export function rupees(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

export function todayIST() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10);
}

export function formatDay(value) {
  if (!value) return null;
  return new Date(`${String(value).slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(String(value).replace(' ', 'T')).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function apiError(err, fallback) {
  return err?.response?.data?.message || fallback;
}

export function countEmails(raw) {
  const seen = new Set();
  for (const part of String(raw || '').split(/[\s,;]+/)) {
    const e = part.trim().toLowerCase();
    if (e) seen.add(e);
  }
  return seen.size;
}
