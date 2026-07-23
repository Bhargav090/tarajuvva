const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const NOTIFY_TO = process.env.NOTIFY_EMAIL || process.env.SMTP_REPLY_TO || 'support@tarajuvva.com';

const EMAIL_LOGO_CID = 'tarajuvva-logo@tarajuvva';
const EMAIL_LOGO_PATH = path.join(__dirname, '../../assets/email-logo.png');

const BRAND = {
  green: '#c8ff2e',
  greenDeep: '#a8e000',
  burgundy: '#7A063C',
  burgundyDeep: '#5a0530',
  pink: '#e2a3c9',
  ink: '#0a0a0a',
  inkSoft: '#4a4a4a',
  muted: '#6b6b6b',
  line: '#e8e8e4',
  soft: '#f6f6f4',
  white: '#ffffff',
  repair: '#1a3df0',
  donate: '#ff6a1a',
};

let transporter = null;

function siteUrl(path = '/') {
  let base = String(process.env.FRONTEND_URL || 'https://tarajuvva.com').replace(/\/$/, '');
  // Localhost in FRONTEND_URL breaks "View order" links in real inboxes (common prod misconfig).
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(base)) {
    console.warn(
      '[notifyEmail] FRONTEND_URL is localhost — email links use https://tarajuvva.com. Set FRONTEND_URL=https://tarajuvva.com on the server.'
    );
    base = 'https://tarajuvva.com';
  }
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nl2br(value) {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}

function shortId(id) {
  return String(id || '').slice(0, 8).toUpperCase();
}

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

  const attachments = [];
  if (html && fs.existsSync(EMAIL_LOGO_PATH)) {
    attachments.push({
      filename: 'tarajuvva-logo.png',
      path: EMAIL_LOGO_PATH,
      cid: EMAIL_LOGO_CID,
      contentDisposition: 'inline',
    });
  }

  try {
    await tx.sendMail({
      from,
      to,
      replyTo: replyTo || undefined,
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>'),
      attachments: attachments.length ? attachments : undefined,
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

/* ─── HTML email building blocks ───────────────────────────────────────────── */

function renderButton({ href, label, variant = 'dark' }) {
  const styles = {
    dark: { bg: BRAND.ink, color: BRAND.white, border: BRAND.ink },
    green: { bg: BRAND.green, color: BRAND.ink, border: BRAND.ink },
    burgundy: { bg: BRAND.burgundy, color: BRAND.white, border: BRAND.burgundy },
    repair: { bg: BRAND.repair, color: BRAND.white, border: BRAND.repair },
    donate: { bg: BRAND.donate, color: BRAND.white, border: BRAND.donate },
    outline: { bg: BRAND.white, color: BRAND.ink, border: BRAND.ink },
  };
  const s = styles[variant] || styles.dark;
  return `
    <a href="${escapeHtml(href)}"
       style="display:inline-block;padding:14px 22px;background:${s.bg};color:${s.color};border:2px solid ${s.border};text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;line-height:1;">
      ${escapeHtml(label)}
    </a>`;
}

function renderButtons(buttons = []) {
  if (!buttons.length) return '';
  const cells = buttons
    .map(
      (b, i) => `
      <td style="padding:${i === 0 ? '0' : '0 0 0 10px'};">
        ${renderButton(b)}
      </td>`
    )
    .join('');
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
      <tr>${cells}</tr>
    </table>`;
}

function renderDetailRows(rows = []) {
  const filtered = rows.filter((r) => r && r.value != null && r.value !== '');
  if (!filtered.length) return '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:20px 0;border:1px solid ${BRAND.line};">
      ${filtered
        .map(
          (r, i) => `
        <tr>
          <td style="padding:12px 14px;width:38%;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};border-top:${i === 0 ? '0' : `1px solid ${BRAND.line}`};vertical-align:top;">
            ${escapeHtml(r.label)}
          </td>
          <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};border-top:${i === 0 ? '0' : `1px solid ${BRAND.line}`};vertical-align:top;">
            ${r.html ? r.value : nl2br(r.value)}
          </td>
        </tr>`
        )
        .join('')}
    </table>`;
}

function renderItemList(items = []) {
  if (!items.length) return '';
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:8px 0 20px;border:1px solid ${BRAND.line};">
      <tr>
        <td colspan="2" style="padding:12px 14px;background:${BRAND.soft};font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.muted};border-bottom:1px solid ${BRAND.line};">
          Items
        </td>
      </tr>
      ${items
        .map(
          (item, i) => `
        <tr>
          <td style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};border-top:${i === 0 ? '0' : `1px solid ${BRAND.line}`};">
            ${escapeHtml(item.name)}${item.size ? ` <span style="color:${BRAND.muted};">(${escapeHtml(item.size)})</span>` : ''}
            <span style="color:${BRAND.muted};"> × ${escapeHtml(item.qty)}</span>
          </td>
          <td align="right" style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${BRAND.ink};white-space:nowrap;border-top:${i === 0 ? '0' : `1px solid ${BRAND.line}`};">
            ${item.lineTotal != null ? escapeHtml(money(item.lineTotal)) : ''}
          </td>
        </tr>`
        )
        .join('')}
    </table>`;
}

/**
 * Shared Tarajuvva email shell — table-based for client compatibility.
 * accent: 'green' | 'burgundy' | 'dark' | 'repair' | 'donate'
 */
function buildEmailHtml({
  accent = 'dark',
  eyebrow = 'Tarajuvva',
  title,
  preheader = '',
  introHtml = '',
  detailRows = [],
  items = [],
  noteHtml = '',
  buttons = [],
  footerNote = 'Questions? Reply to this email or write to contact@tarajuvva.com.',
}) {
  const accentMap = {
    green: BRAND.green,
    burgundy: BRAND.burgundy,
    dark: BRAND.ink,
    repair: BRAND.repair,
    donate: BRAND.donate,
  };
  const bar = accentMap[accent] || BRAND.ink;
  const year = new Date().getFullYear();
  const home = siteUrl('/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.soft};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.soft};">
    <tr>
      <td align="center" style="padding:28px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${BRAND.white};border:2px solid ${BRAND.ink};">
          <tr>
            <td style="height:8px;line-height:8px;font-size:0;background:${bar};">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <a href="${escapeHtml(home)}" style="text-decoration:none;display:inline-block;">
                <img
                  src="cid:${EMAIL_LOGO_CID}"
                  alt="Tarajuvva"
                  width="220"
                  height="auto"
                  style="display:block;width:220px;max-width:85%;height:auto;border:0;outline:none;"
                />
              </a>
              <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${BRAND.muted};">
                ${escapeHtml(eyebrow)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 8px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:1.25;font-weight:800;color:${BRAND.ink};">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">
              ${introHtml}
              ${renderDetailRows(detailRows)}
              ${renderItemList(items)}
              ${noteHtml}
              ${renderButtons(buttons)}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px;">
              <div style="border-top:1px solid ${BRAND.line};"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:${BRAND.muted};">
              <p style="margin:0 0 10px;">${escapeHtml(footerNote)}</p>
              <p style="margin:0;">
                <a href="${escapeHtml(home)}" style="color:${BRAND.ink};text-decoration:underline;">tarajuvva.com</a>
                &nbsp;·&nbsp; Wear it. Upcycle it. Repair it. Donate it.
              </p>
              <p style="margin:14px 0 0;font-size:11px;color:#9a9a9a;">© ${year} Tarajuvva. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function parseOrderItems(order) {
  let items = [];
  try {
    items = JSON.parse(order.items || '[]');
  } catch {
    items = [];
  }
  return items.map((i) => ({
    name: i.name,
    size: i.size,
    qty: i.qty,
    lineTotal: i.price != null ? i.price * i.qty : null,
  }));
}

/* ─── Formatters ───────────────────────────────────────────────────────────── */

function formatPickupDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PICKUP_PERIOD_LABELS = {
  morning: 'Morning (9–11 AM)',
  afternoon: 'Afternoon (12–4 PM)',
  evening: 'Evening (4–8 PM)',
};

function formatPickupPeriod(value) {
  const key = String(value || '').trim().toLowerCase();
  return PICKUP_PERIOD_LABELS[key] || null;
}

function formatPickupSummary(r) {
  const date = formatPickupDate(r.pickup_date);
  const period = formatPickupPeriod(r.pickup_period);
  if (date && period) return `${date} · ${period}`;
  return date || period || null;
}

function formatCustomerHeight(r) {
  const ft = r.height_ft != null ? Number(r.height_ft) : NaN;
  const inch = r.height_in != null ? Number(r.height_in) : NaN;
  if (!Number.isFinite(ft) || !Number.isFinite(inch)) return null;
  return `${ft}'${inch}"`;
}

function formatFitSummary(r) {
  const parts = [];
  if (r.garment_size) parts.push(`Current ${r.garment_size}`);
  if (r.transformation_size) parts.push(`Desired ${r.transformation_size}`);
  const h = formatCustomerHeight(r);
  if (h) parts.push(`Height ${h}`);
  return parts.length ? parts.join(' · ') : null;
}

function formatSlotLabelFromRequest(r) {
  if (r.consultation_slot_label) return r.consultation_slot_label;
  if (r.consultation_date && r.consultation_time) {
    return `${r.consultation_date} · ${r.consultation_time}`;
  }
  return null;
}

function reimagineConsultPrice(r) {
  return r.consultation_price ?? r.consultation_fee ?? null;
}

function formatReimagineRequestEmail(r) {
  const id = shortId(r.id);
  const isCustom = Boolean(r.is_custom);
  const slotLabel = formatSlotLabelFromRequest(r);
  const consultPrice = reimagineConsultPrice(r);
  const pickup = formatPickupSummary(r);
  const fit = formatFitSummary(r);

  const text = [
    isCustom ? `New CUSTOM Reimagine consultation #${id}` : `New Reimagine order #${id}`,
    '',
    `Name: ${r.user_name}`,
    `Phone: ${r.user_phone}`,
    `Email: ${r.user_email || '—'}`,
    `Garment: ${r.garment_type}`,
    `Upcycle: ${r.transformation}`,
    fit ? `Fit: ${fit}` : null,
    r.consultation_paid ? `Consultation booked: Yes` : null,
    r.payment_status === 'paid' ? `Payment: Paid` : r.payment_status ? `Payment: ${r.payment_status}` : null,
    consultPrice ? `Consultation price: ${money(consultPrice)}` : null,
    r.callback_requested ? 'Callback requested: Yes — team to contact customer' : null,
    slotLabel ? `Consultation slot: ${slotLabel}` : null,
    pickup ? `Preferred pickup: ${pickup}` : null,
    r.delivery_zone
      ? `Delivery zone: ${r.delivery_zone}${r.delivery_fee != null ? ` (₹${Number(r.delivery_fee)})` : ''}`
      : null,
    `Custom: ${isCustom ? 'Yes' : 'No'}`,
    '',
    `Address:\n${r.address || '—'}`,
    r.notes ? `\nNotes:\n${r.notes}` : null,
    r.images?.length ? `\nPhotos: ${r.images.length} uploaded` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildEmailHtml({
    accent: 'burgundy',
    eyebrow: isCustom ? 'Admin · Custom Reimagine' : 'Admin · Reimagine order',
    title: isCustom ? `Custom consult #${id}` : `New order #${id}`,
    preheader: isCustom
      ? `${r.user_name} booked a custom Reimagine consultation`
      : `${r.user_name} placed a Reimagine order`,
    introHtml: `<p style="margin:0 0 8px;">${
      isCustom
        ? r.callback_requested
          ? 'A custom Reimagine consultation callback was requested — contact the customer within 24 hours.'
          : 'A custom Reimagine consultation just came in.'
        : 'A new Reimagine order just came in.'
    }</p>`,
    detailRows: [
      { label: 'Customer', value: r.user_name },
      { label: 'Phone', value: r.user_phone },
      { label: 'Email', value: r.user_email || '—' },
      { label: 'Type', value: isCustom ? 'Custom consultation' : 'Preset upcycle' },
      { label: 'Garment', value: r.garment_type },
      { label: 'Upcycle', value: r.transformation },
      fit ? { label: 'Fit', value: fit } : null,
      r.consultation_paid ? { label: 'Consultation', value: 'Booked' } : null,
      r.payment_status ? { label: 'Payment', value: r.payment_status === 'paid' ? 'Paid' : r.payment_status } : null,
      consultPrice ? { label: 'Consult price', value: money(consultPrice) } : null,
      r.callback_requested ? { label: 'Callback', value: 'Yes — contact customer' } : null,
      slotLabel ? { label: 'Slot', value: slotLabel } : null,
      pickup ? { label: 'Pickup', value: pickup } : null,
      r.delivery_zone
        ? {
            label: 'Delivery zone',
            value: `${r.delivery_zone}${
              r.delivery_fee != null ? ` · ${money(r.delivery_fee)}` : ''
            }`,
          }
        : null,
      { label: 'Address', value: r.address || '—' },
      r.notes ? { label: 'Notes', value: r.notes } : null,
      r.images?.length ? { label: 'Photos', value: `${r.images.length} uploaded` } : null,
    ].filter(Boolean),
    buttons: [{ href: siteUrl('/admin'), label: 'Open admin', variant: 'burgundy' }],
  });

  return {
    subject: isCustom
      ? `[Tarajuvva] Custom Reimagine — ${r.user_name}`
      : `[Tarajuvva] Reimagine order — ${r.user_name}`,
    text,
    html,
  };
}

function formatReimagineCustomerEmail(r) {
  const id = shortId(r.id);
  const isCustom = Boolean(r.is_custom);
  const slotLabel = formatSlotLabelFromRequest(r);
  const pickup = formatPickupSummary(r);
  const fit = formatFitSummary(r);
  const paid = r.payment_status === 'paid' || Boolean(r.consultation_paid);

  if (isCustom) {
    const callback = Boolean(r.callback_requested);
    const introLine = callback
      ? "We've received your custom Reimagine consultation. Our team will call you within 24 hours to find a time that works."
      : "We've received your custom Reimagine consultation booking. Our team will review the details and prepare for your session.";
    const highlight = paid
      ? 'Your consultation payment is confirmed.'
      : callback
        ? 'No payment needed yet — this is a callback request.'
        : null;

    const text = [
      `Hi ${r.user_name},`,
      '',
      introLine,
      '',
      `Order #${id}`,
      slotLabel ? `Consultation: ${slotLabel}` : null,
      paid ? 'Your consultation payment is confirmed.' : null,
      callback ? 'Callback requested — we will contact you soon.' : null,
      r.notes ? `\nYour notes:\n${r.notes}` : null,
      '',
      `Track it: ${siteUrl('/profile/reimagine')}`,
      '',
      '— Tarajuvva',
    ]
      .filter(Boolean)
      .join('\n');

    const html = buildEmailHtml({
      accent: 'burgundy',
      eyebrow: 'Custom Reimagine',
      title: callback ? 'Callback requested' : 'Consultation booked',
      preheader: `Your custom Reimagine consultation #${id} is in`,
      introHtml: `
        <p style="margin:0 0 12px;">Hi ${escapeHtml(r.user_name)},</p>
        <p style="margin:0;">${escapeHtml(introLine)}</p>
        ${
          highlight
            ? `<p style="margin:14px 0 0;padding:12px 14px;background:${BRAND.soft};border-left:4px solid ${BRAND.burgundy};color:${BRAND.ink};">${escapeHtml(highlight)}</p>`
            : ''
        }`,
      detailRows: [
        { label: 'Order', value: `#${id}` },
        { label: 'Type', value: 'Custom consultation' },
        slotLabel ? { label: 'Consultation', value: slotLabel } : null,
        callback ? { label: 'Callback', value: 'Yes — we will contact you' } : null,
        paid ? { label: 'Payment', value: 'Confirmed' } : null,
        r.notes ? { label: 'Notes', value: r.notes } : null,
      ].filter(Boolean),
      buttons: [
        { href: siteUrl('/profile/reimagine'), label: 'View my orders', variant: 'burgundy' },
        { href: siteUrl('/reimagine'), label: 'Explore Reimagine', variant: 'outline' },
      ],
    });

    return {
      subject: callback
        ? 'Your Tarajuvva custom Reimagine callback is received'
        : 'Your Tarajuvva custom Reimagine consultation is booked',
      text,
      html,
    };
  }

  const text = [
    `Hi ${r.user_name},`,
    '',
    "We've received your Reimagine order at Tarajuvva.",
    '',
    `Order #${id}`,
    `Garment: ${r.garment_type}`,
    `Upcycle: ${r.transformation}`,
    fit ? `Fit: ${fit}` : null,
    slotLabel ? `Consultation: ${slotLabel}` : null,
    pickup ? `Preferred pickup: ${pickup}` : null,
    paid ? 'Your payment is confirmed.' : null,
    '',
    "We'll review your order and get back within 24 hours.",
    '',
    `Track it: ${siteUrl('/profile/reimagine')}`,
    '',
    '— Tarajuvva',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildEmailHtml({
    accent: 'burgundy',
    eyebrow: 'Reimagine order',
    title: 'Order received',
    preheader: `We've got your Reimagine order #${id}`,
    introHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(r.user_name)},</p>
      <p style="margin:0;">We've received your Reimagine order. Our team will review it and get back within 24 hours.</p>
      ${
        paid
          ? `<p style="margin:14px 0 0;padding:12px 14px;background:${BRAND.soft};border-left:4px solid ${BRAND.burgundy};color:${BRAND.ink};">Your payment is confirmed.</p>`
          : ''
      }`,
    detailRows: [
      { label: 'Order', value: `#${id}` },
      { label: 'Garment', value: r.garment_type },
      { label: 'Upcycle', value: r.transformation },
      fit ? { label: 'Fit', value: fit } : null,
      slotLabel ? { label: 'Consultation', value: slotLabel } : null,
      pickup ? { label: 'Preferred pickup', value: pickup } : null,
    ].filter(Boolean),
    buttons: [
      { href: siteUrl('/profile/reimagine'), label: 'View my orders', variant: 'burgundy' },
      { href: siteUrl('/reimagine'), label: 'Reimagine again', variant: 'outline' },
    ],
  });

  return {
    subject: 'Your Tarajuvva Reimagine order is received',
    text,
    html,
  };
}

function formatOrderEmail(order) {
  const id = shortId(order.id);
  const items = parseOrderItems(order);
  const itemLines = items.map(
    (i) =>
      `- ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty}${
        i.lineTotal != null ? ` — ${money(i.lineTotal)}` : ''
      }`
  );

  const text = [
    `New order #${id}`,
    '',
    `Customer: ${order.user_name}`,
    `Phone: ${order.user_phone}`,
    `Email: ${order.user_email || '—'}`,
    `Total: ${money(order.total)}`,
    order.delivery_zone
      ? `Delivery: ${order.delivery_zone}${
          order.delivery_fee != null ? ` (${money(order.delivery_fee)})` : ''
        }`
      : null,
    `Payment: ${order.payment_method || 'razorpay'}${order.payment_status ? ` (${order.payment_status})` : ''}`,
    order.razorpay_payment_id ? `Razorpay ID: ${order.razorpay_payment_id}` : null,
    '',
    `Address:\n${order.address}`,
    '',
    'Items:',
    ...itemLines,
    order.notes ? `\nNotes:\n${order.notes}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildEmailHtml({
    accent: 'green',
    eyebrow: 'Admin · Shop',
    title: `New order #${id}`,
    preheader: `${order.user_name} placed an order for ${money(order.total)}`,
    introHtml: `<p style="margin:0 0 8px;">A new shop order just landed.</p>`,
    detailRows: [
      { label: 'Customer', value: order.user_name },
      { label: 'Phone', value: order.user_phone },
      { label: 'Email', value: order.user_email || '—' },
      { label: 'Total', value: money(order.total) },
      order.delivery_zone
        ? {
            label: 'Delivery',
            value: `${order.delivery_zone}${
              order.delivery_fee != null ? ` · ${money(order.delivery_fee)}` : ''
            }`,
          }
        : null,
      {
        label: 'Payment',
        value: `${order.payment_method || 'razorpay'}${order.payment_status ? ` (${order.payment_status})` : ''}`,
      },
      order.razorpay_payment_id ? { label: 'Razorpay', value: order.razorpay_payment_id } : null,
      { label: 'Address', value: order.address },
      order.notes ? { label: 'Notes', value: order.notes } : null,
    ].filter(Boolean),
    items,
    buttons: [{ href: siteUrl('/admin'), label: 'Open admin', variant: 'green' }],
  });

  return {
    subject: `[Tarajuvva] New order — ${order.user_name}`,
    text,
    html,
  };
}

function formatOrderCustomerEmail(order) {
  const id = shortId(order.id);
  const items = parseOrderItems(order);
  const orderUrl = siteUrl(`/profile/orders/${order.id}`);
  const paymentLabel =
    order.payment_status === 'paid' ? 'Payment confirmed' : 'Payment pending';

  const text = [
    `Hi ${order.user_name},`,
    '',
    'Thank you for your order at Tarajuvva!',
    '',
    `Order #${id}`,
    `Total: ${money(order.total)}`,
    `Payment: ${paymentLabel}`,
    '',
    'Items:',
    ...items.map((i) => `- ${i.name}${i.size ? ` (${i.size})` : ''} × ${i.qty}`),
    '',
    `Delivery address:\n${order.address}`,
    order.notes ? `\nNotes:\n${order.notes}` : null,
    '',
    "We'll notify you when your order ships.",
    '',
    `Track your order: ${orderUrl}`,
    '',
    '— Tarajuvva',
  ]
    .filter(Boolean)
    .join('\n');

  const html = buildEmailHtml({
    accent: 'green',
    eyebrow: 'Shop order',
    title: 'Order confirmed',
    preheader: `Thanks ${order.user_name} — order #${id} is confirmed`,
    introHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(order.user_name)},</p>
      <p style="margin:0;">Thank you for shopping with Tarajuvva. Your order is confirmed and we'll update you when it ships.</p>`,
    detailRows: [
      { label: 'Order', value: `#${id}` },
      { label: 'Total', value: money(order.total) },
      order.delivery_fee != null && Number(order.delivery_fee) > 0
        ? { label: 'Delivery fee', value: money(order.delivery_fee) }
        : null,
      { label: 'Payment', value: paymentLabel },
      { label: 'Deliver to', value: order.address },
      order.notes ? { label: 'Notes', value: order.notes } : null,
    ].filter(Boolean),
    items,
    buttons: [
      { href: orderUrl, label: 'Track order', variant: 'green' },
      { href: siteUrl('/profile/orders'), label: 'All orders', variant: 'outline' },
    ],
  });

  return {
    subject: `Tarajuvva order confirmed — #${id}`,
    text,
    html,
  };
}

function formatOrderShippedEmail(order) {
  const id = shortId(order.id);
  const orderUrl = siteUrl(`/profile/orders/${order.id}`);
  const tracking = String(order.tracking_url || '').trim();
  const items = parseOrderItems(order);

  const text = [
    `Hi ${order.user_name},`,
    '',
    `Great news — your Tarajuvva order #${id} has shipped!`,
    '',
    tracking ? `Track your shipment:\n${tracking}` : 'Tracking details will follow if available.',
    '',
    `Order page: ${orderUrl}`,
    '',
    '— Tarajuvva',
  ].join('\n');

  const html = buildEmailHtml({
    accent: 'green',
    eyebrow: 'Shop order',
    title: 'Your order has shipped',
    preheader: `Order #${id} is on the way`,
    introHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(order.user_name)},</p>
      <p style="margin:0;">Your Tarajuvva order is on its way. Use the tracking link below to follow your shipment.</p>`,
    detailRows: [
      { label: 'Order', value: `#${id}` },
      { label: 'Status', value: 'Shipped' },
      tracking ? { label: 'Tracking', value: tracking } : null,
      { label: 'Deliver to', value: order.address },
    ].filter(Boolean),
    items,
    buttons: [
      ...(tracking
        ? [{ href: tracking, label: 'Track shipment', variant: 'green' }]
        : []),
      { href: orderUrl, label: 'View order', variant: 'outline' },
    ],
  });

  return {
    subject: `Your Tarajuvva order #${id} has shipped`,
    text,
    html,
  };
}

function formatWaitlistAdminEmail(entry) {
  const label = entry.type === 'repair' ? 'Repair' : entry.type === 'donate' ? 'Donate' : entry.type;
  const accent = entry.type === 'repair' ? 'repair' : entry.type === 'donate' ? 'donate' : 'dark';

  const text = [
    `New waitlist signup (${entry.type})`,
    '',
    `Name: ${entry.name}`,
    `Email: ${entry.email}`,
    `Phone: ${entry.phone || '—'}`,
  ].join('\n');

  const html = buildEmailHtml({
    accent,
    eyebrow: 'Admin · Waitlist',
    title: `${label} waitlist signup`,
    preheader: `${entry.name} joined the ${label} waitlist`,
    introHtml: `<p style="margin:0;">Someone just joined the ${escapeHtml(label)} waitlist.</p>`,
    detailRows: [
      { label: 'Name', value: entry.name },
      { label: 'Email', value: entry.email },
      { label: 'Phone', value: entry.phone || '—' },
      { label: 'Type', value: label },
    ],
    buttons: [{ href: siteUrl('/admin'), label: 'Open admin', variant: 'dark' }],
  });

  return {
    subject: `[Tarajuvva] Waitlist signup — ${entry.type}`,
    text,
    html,
  };
}

function formatWaitlistCustomerEmail(entry) {
  const label = entry.type === 'repair' ? 'Repair' : entry.type === 'donate' ? 'Donate' : entry.type;
  const accent = entry.type === 'repair' ? 'repair' : entry.type === 'donate' ? 'donate' : 'dark';
  const sectionPath = entry.type === 'repair' ? '/repair' : entry.type === 'donate' ? '/donate' : '/';

  const text = [
    `Hi ${entry.name},`,
    '',
    `Thanks for joining the Tarajuvva ${label} waitlist.`,
    "We'll email you as soon as this goes live.",
    '',
    `Explore Tarajuvva: ${siteUrl('/')}`,
    '',
    '— Tarajuvva',
  ].join('\n');

  const html = buildEmailHtml({
    accent,
    eyebrow: `${label} waitlist`,
    title: "You're on the list",
    preheader: `You're on the Tarajuvva ${label} waitlist`,
    introHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(entry.name)},</p>
      <p style="margin:0;">Thanks for joining the Tarajuvva ${escapeHtml(label)} waitlist. We'll email you the moment it goes live.</p>`,
    detailRows: [{ label: 'Waitlist', value: label }],
    buttons: [
      { href: siteUrl(sectionPath), label: `Visit ${label}`, variant: accent === 'dark' ? 'dark' : accent },
      { href: siteUrl('/shop'), label: 'Shop now', variant: 'outline' },
    ],
  });

  return {
    subject: `You're on the Tarajuvva ${label} waitlist`,
    text,
    html,
  };
}

async function notifyReimagineRequest(r) {
  try {
    const adminPayload = formatReimagineRequestEmail(r);
    const adminResult = await sendNotifyEmail(adminPayload);
    if (!adminResult?.ok && !adminResult?.skipped) {
      console.error('[notifyEmail] admin reimagine notify failed:', adminResult?.error || adminResult);
    } else if (adminResult?.skipped) {
      console.warn('[notifyEmail] admin reimagine notify skipped (SMTP not configured)');
    } else {
      console.log('[notifyEmail] admin reimagine notify sent to', NOTIFY_TO, 'for', shortId(r.id));
    }
    if (r.user_email) {
      const customerPayload = formatReimagineCustomerEmail(r);
      const customerResult = await sendCustomerEmail(r.user_email, customerPayload);
      if (!customerResult?.ok && !customerResult?.skipped) {
        console.error('[notifyEmail] customer reimagine notify failed:', customerResult?.error || customerResult);
      }
    }
  } catch (err) {
    console.error('[notifyEmail] notifyReimagineRequest error:', err.message || err);
    throw err;
  }
}

async function notifyOrder(order) {
  try {
    const adminPayload = formatOrderEmail(order);
    await sendNotifyEmail(adminPayload);
    if (order.user_email) {
      const customerPayload = formatOrderCustomerEmail(order);
      await sendCustomerEmail(order.user_email, customerPayload);
    }
  } catch (err) {
    console.error('[notifyEmail] notifyOrder error:', err.message || err);
    throw err;
  }
}

async function notifyOrderShipped(order) {
  try {
    if (order.user_email) {
      const result = await sendCustomerEmail(order.user_email, formatOrderShippedEmail(order));
      if (!result?.ok && !result?.skipped) {
        console.error('[notifyEmail] customer shipped notify failed:', result?.error || result);
      } else {
        console.log('[notifyEmail] shipped email sent to', order.user_email, 'for', shortId(order.id));
      }
    } else {
      console.warn('[notifyEmail] shipped notify skipped — no customer email on order', shortId(order.id));
    }
    await sendNotifyEmail({
      subject: `[Tarajuvva] Order shipped — ${order.user_name}`,
      text: [
        `Order #${shortId(order.id)} marked shipped`,
        `Customer: ${order.user_name}`,
        `Email: ${order.user_email || '—'}`,
        order.tracking_url ? `Tracking: ${order.tracking_url}` : 'Tracking: —',
      ].join('\n'),
      html: buildEmailHtml({
        accent: 'green',
        eyebrow: 'Admin · Shop',
        title: `Shipped #${shortId(order.id)}`,
        introHtml: `<p style="margin:0;">Order marked as shipped${order.tracking_url ? ' with tracking link.' : '.'}</p>`,
        detailRows: [
          { label: 'Customer', value: order.user_name },
          { label: 'Email', value: order.user_email || '—' },
          order.tracking_url ? { label: 'Tracking', value: order.tracking_url } : null,
        ].filter(Boolean),
        buttons: [{ href: siteUrl('/admin?tab=orders'), label: 'Open orders', variant: 'green' }],
      }),
    });
  } catch (err) {
    console.error('[notifyEmail] notifyOrderShipped error:', err.message || err);
    throw err;
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
  notifyOrderShipped,
  notifyWaitlistEntry,
};
