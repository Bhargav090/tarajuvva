/** Normalize MySQL TIME to HH:MM:SS. */
function toTimeString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 8);
  return String(value).slice(0, 8);
}

/** Normalize MySQL DATE / ISO datetime to YYYY-MM-DD for APIs and labels. */
function toISODateString(value) {
  if (!value) return '';
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, '0');
    const d = String(value.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/** Generate consultation slot times between start and end (exclusive of end). */
function generateSlotTimes(startTime, endTime, intervalMinutes) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  const interval = Math.max(5, Number(intervalMinutes) || 20);
  const times = [];

  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    times.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
    cur += interval;
  }
  return times;
}

function eachDateInclusive(fromDate, toDate) {
  const dates = [];
  const cur = new Date(`${fromDate}T12:00:00`);
  const end = new Date(`${toDate}T12:00:00`);
  if (Number.isNaN(cur.getTime()) || Number.isNaN(end.getTime()) || cur > end) return dates;

  while (cur <= end) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function formatSlotLabel(slotDate, slotTime) {
  const iso = toISODateString(slotDate);
  const d = new Date(`${iso}T12:00:00`);
  const dateLabel = d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const [h, m] = slotTime.split(':').map(Number);
  const t = new Date(2000, 0, 1, h, m);
  const timeLabel = t.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${dateLabel} · ${timeLabel}`;
}

function generateSlotsPreview({ from_date, to_date, start_time, end_time, interval_minutes = 20 }) {
  if (!from_date || !to_date || !start_time || !end_time) {
    const err = new Error('From date, to date, start time, and end time are required.');
    err.status = 400;
    throw err;
  }

  const dates = eachDateInclusive(from_date, to_date);
  const times = generateSlotTimes(start_time, end_time, interval_minutes);

  if (!dates.length || !times.length) {
    const err = new Error('No slots generated. Check date range and times.');
    err.status = 400;
    throw err;
  }

  const slots = [];
  for (const slot_date of dates) {
    for (const slot_time of times) {
      slots.push({
        key: `${slot_date}_${slot_time}`,
        slot_date,
        slot_time,
        label: formatSlotLabel(slot_date, slot_time),
      });
    }
  }
  return slots;
}

function normalizeSlotRow(row) {
  const slot_date = toISODateString(row.slot_date);
  const slot_time = toTimeString(row.slot_time);
  return {
    ...row,
    slot_date,
    slot_time,
    label: formatSlotLabel(slot_date, slot_time),
  };
}

function normalizeReimagineRequest(row) {
  return {
    ...row,
    consultation_date: row.consultation_date ? toISODateString(row.consultation_date) : null,
    consultation_time: row.consultation_time ? toTimeString(row.consultation_time) : null,
  };
}

module.exports = {
  toISODateString,
  toTimeString,
  generateSlotTimes,
  eachDateInclusive,
  formatSlotLabel,
  generateSlotsPreview,
  normalizeSlotRow,
  normalizeReimagineRequest,
};
