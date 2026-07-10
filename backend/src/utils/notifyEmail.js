const nodemailer = require('nodemailer');

const NOTIFY_TO = process.env.NOTIFY_EMAIL || process.env.SMTP_REPLY_TO || 'support@tarajuvva.com';

let transporter = null;

function mailFrom() {
  const addr = process.env.SMTP_FROM || process.env.SMTP_USER;
  const name = process.env.SMTP_FROM_NAME || 'Tarajuvva';
  if (!addr) return null;
  return name ? `"${name}" <${addr}>` : addr;
}

function mailReplyTo() {
  return process.env.SMTP_REPLY_TO || process.env.SMTP_USER || null;
}

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

async function sendMail({ to, subject, text, html }) {
  const tx = getTransporter();
  if (!tx) {
    console.warn('[notifyEmail] SMTP not configured — skipped:', subject);
    return { ok: false, skipped: true };
  }

  const from = mailFrom();
  const replyTo = mailReplyTo();
  if (!from) {
    console.warn('[notifyEmail] SMTP_FROM not configured — skipped:', subject);
    return { ok: false, skipped: true };
  }
  try {
    await tx.sendMail({
      from,
      to,
      replyTo: replyTo || undefined,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
    });
    return { ok: true };
  } catch (err) {
    console.error('[notifyEmail]', err.message);
    return { ok: false, error: err.message };
  }
}

async function sendNotifyEmail({ subject, text, html }) {
  return sendMail({ to: NOTIFY_TO, subject, text, html });
}

async function sendCustomerEmail(to, { subject, text, html }) {
  const email = String(to || '').trim();
  if (!email) return { ok: false, skipped: true };
  return sendMail({ to: email, subject, text, html });
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
    r.consultation_paid ? `Consultation booked: Yes` : null,
    r.payment_status === 'paid' ? `Payment: Paid` : r.payment_status ? `Payment: ${r.payment_status}` : null,
    r.consultation_price ? `Consultation price: ₹${r.consultation_price}` : null,
    r.callback_requested ? 'Callback requested: Yes — team to contact customer' : null,
    r.consultation_slot_label ? `Consultation slot: ${r.consultation_slot_label}` : null,
    r.pickup_date ? `Preferred pickup date: ${r.pickup_date}` : null,
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

function formatReimagineCustomerEmail(r) {
  const lines = [
    `Hi ${r.user_name},`,
    '',
    "We've received your Reimagine request at Tarajuvva.",
    '',
    `Garment: ${r.garment_type}`,
    `Transformation: ${r.transformation}`,
    r.consultation_slot_label ? `Consultation: ${r.consultation_slot_label}` : null,
    r.pickup_date ? `Preferred pickup: ${r.pickup_date}` : null,
    r.payment_status === 'paid' ? 'Your consultation payment is confirmed.' : null,
    '',
    "We'll review your request and get back within 24 hours.",
    '',
    '— Tarajuvva',
  ].filter(Boolean);

  return {
    subject: 'Your Tarajuvva Reimagine request is received',
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
    `Payment: ${order.payment_method || 'cod'}${order.payment_status ? ` (${order.payment_status})` : ''}`,
    order.razorpay_payment_id ? `Razorpay ID: ${order.razorpay_payment_id}` : null,
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

function formatOrderCustomerEmail(order) {
  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch {
    items = [];
  }

  const itemLines = items.map((i) => `- ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty}`);

  const lines = [
    `Hi ${order.user_name},`,
    '',
    'Thank you for your order at Tarajuvva!',
    '',
    `Order #${order.id.slice(0, 8).toUpperCase()}`,
    `Total: ₹${Number(order.total).toLocaleString('en-IN')}`,
    order.payment_status === 'paid' ? 'Payment: Confirmed' : 'Payment: Cash on delivery',
    '',
    'Items:',
    ...itemLines,
    '',
    `Delivery address:\n${order.address}`,
    order.notes ? `\nNotes:\n${order.notes}` : null,
    '',
    "We'll notify you when your order ships.",
    '',
    '— Tarajuvva',
  ].filter(Boolean);

  return {
    subject: `Tarajuvva order confirmed — #${order.id.slice(0, 8).toUpperCase()}`,
    text: lines.join('\n'),
  };
}

function formatWaitlistAdminEmail(entry) {
  return {
    subject: `[Tarajuvva] Waitlist signup — ${entry.type}`,
    text: [
      `New waitlist signup (${entry.type})`,
      '',
      `Name: ${entry.name}`,
      `Email: ${entry.email}`,
      `Phone: ${entry.phone || '—'}`,
    ].join('\n'),
  };
}

function formatWaitlistCustomerEmail(entry) {
  const label = entry.type === 'repair' ? 'Repair' : entry.type === 'donate' ? 'Donate' : entry.type;
  return {
    subject: `You're on the Tarajuvva ${label} waitlist`,
    text: [
      `Hi ${entry.name},`,
      '',
      `Thanks for joining the Tarajuvva ${label} waitlist.`,
      "We'll email you as soon as this goes live.",
      '',
      '— Tarajuvva',
    ].join('\n'),
  };
}

async function notifyReimagineRequest(r) {
  const adminPayload = formatReimagineRequestEmail(r);
  await sendNotifyEmail(adminPayload);
  if (r.user_email) {
    const customerPayload = formatReimagineCustomerEmail(r);
    await sendCustomerEmail(r.user_email, customerPayload);
  }
}

async function notifyOrder(order) {
  const adminPayload = formatOrderEmail(order);
  await sendNotifyEmail(adminPayload);
  if (order.user_email) {
    const customerPayload = formatOrderCustomerEmail(order);
    await sendCustomerEmail(order.user_email, customerPayload);
  }
}

async function notifyWaitlistEntry(entry) {
  await sendNotifyEmail(formatWaitlistAdminEmail(entry));
  await sendCustomerEmail(entry.email, formatWaitlistCustomerEmail(entry));
}

module.exports = {
  NOTIFY_TO,
  sendNotifyEmail,
  sendCustomerEmail,
  notifyReimagineRequest,
  notifyOrder,
  notifyWaitlistEntry,
};
