const nodemailer = require('nodemailer');

const NOTIFY_TO = process.env.NOTIFY_EMAIL || 'contact@tarajuvva.com';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

async function sendNotifyEmail({ subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[notifyEmail] SMTP not configured — skipped:', subject);
    return { ok: false, skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  try {
    await tx.sendMail({ from, to: NOTIFY_TO, subject, text, html: html || text.replace(/\n/g, '<br>') });
    return { ok: true };
  } catch (err) {
    console.error('[notifyEmail]', err.message);
    return { ok: false, error: err.message };
  }
}

function formatReimagineRequestEmail(r) {
  const lines = [
    `New Reimagine request #${r.id.slice(0, 8).toUpperCase()}`,
    '',
    `Name: ${r.user_name}`,
    `Phone: ${r.user_phone}`,
    `Email: ${r.user_email || '—'}`,
    `Garment: ${r.garment_type}`,
    `Transformation: ${r.transformation}`,
    r.consultation_paid ? `Consultation price: ₹${r.consultation_price || '—'}` : null,
    r.callback_requested ? 'Callback requested: Yes — team to contact customer' : null,
    r.consultation_slot_label ? `Consultation slot: ${r.consultation_slot_label}` : null,
    `Custom: ${r.is_custom ? 'Yes' : 'No'}`,
    '',
    `Address:\n${r.address || '—'}`,
    r.notes ? `\nNotes:\n${r.notes}` : null,
    r.images?.length ? `\nPhotos: ${r.images.length} uploaded` : null,
  ].filter(Boolean);

  return {
    subject: `[Tarajuvva] Reimagine request — ${r.user_name}`,
    text: lines.join('\n'),
  };
}

function formatOrderEmail(order) {
  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch {
    items = [];
  }

  const itemLines = items.map((i) => `- ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty} — ₹${(i.price * i.qty).toLocaleString('en-IN')}`);

  const lines = [
    `New order #${order.id.slice(0, 8).toUpperCase()}`,
    '',
    `Customer: ${order.user_name}`,
    `Phone: ${order.user_phone}`,
    `Email: ${order.user_email || '—'}`,
    `Total: ₹${Number(order.total).toLocaleString('en-IN')}`,
    `Payment: ${order.payment_method || 'cod'}`,
    '',
    `Address:\n${order.address}`,
    '',
    'Items:',
    ...itemLines,
    order.notes ? `\nNotes:\n${order.notes}` : null,
  ].filter(Boolean);

  return {
    subject: `[Tarajuvva] New order — ${order.user_name}`,
    text: lines.join('\n'),
  };
}

async function notifyReimagineRequest(r) {
  const payload = formatReimagineRequestEmail(r);
  return sendNotifyEmail(payload);
}

async function notifyOrder(order) {
  const payload = formatOrderEmail(order);
  return sendNotifyEmail(payload);
}

module.exports = {
  NOTIFY_TO,
  sendNotifyEmail,
  notifyReimagineRequest,
  notifyOrder,
};
