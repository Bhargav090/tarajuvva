#!/usr/bin/env node
/**
 * Tarajuvva smoke / verification script
 *
 * Checks backend API, MySQL, SMTP, email templates, and frontend pages.
 *
 * Usage:
 *   node backend/scripts/verify.js
 *   npm run verify --prefix backend
 *   node backend/scripts/verify.js --email you@example.com   # also send live test emails
 *   node backend/scripts/verify.js --api http://localhost:4000 --web http://localhost:5173
 */

const path = require('path');
const fs = require('fs');
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const args = process.argv.slice(2);
function flagValue(name, fallback) {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  return args[i + 1] || fallback;
}
const SEND_EMAIL_TO = flagValue('--email', null);
const API_BASE = String(flagValue('--api', `http://127.0.0.1:${process.env.PORT || 4000}`)).replace(/\/$/, '');
const WEB_BASE = String(flagValue('--web', process.env.FRONTEND_URL || 'http://localhost:5173')).replace(/\/$/, '');

const results = [];

function ok(section, name, detail = '') {
  results.push({ section, name, pass: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(section, name, detail = '') {
  results.push({ section, name, pass: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n▸ ${title}`);
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, text, json };
}

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  return { res, text };
}

async function checkBackendHealth() {
  section('Backend — health & public APIs');
  try {
    const { res, json } = await fetchJson(`${API_BASE}/api/health`);
    if (res.ok && json?.success) ok('backend', 'GET /api/health', json.message || 'ok');
    else fail('backend', 'GET /api/health', `status ${res.status}`);
  } catch (err) {
    fail('backend', 'GET /api/health', err.message);
    fail('backend', 'API reachable', `Is the backend running on ${API_BASE}?`);
    return false;
  }

  const publicGets = [
    ['GET /api/shop/products', '/api/shop/products', (j) => Array.isArray(j?.products) || Array.isArray(j)],
    ['GET /api/shop/size-charts', '/api/shop/size-charts', (j) => j != null],
    ['GET /api/shop/razorpay/key', '/api/shop/razorpay/key', (j) => j != null],
    ['GET /api/reimagine/conversions', '/api/reimagine/conversions', (j) => j?.success !== false],
    ['GET /api/settings/testimonials', '/api/settings/testimonials', (j) => j != null],
    ['GET /api/settings/reimagine-customize', '/api/settings/reimagine-customize', (j) => j != null],
    ['GET /api/settings/delivery', '/api/settings/delivery', (j) => j?.settings?.shop != null],
    ['GET /api/settings/reimagine-images', '/api/settings/reimagine-images', (j) => j != null],
  ];

  for (const [label, pathName, assert] of publicGets) {
    try {
      const { res, json, text } = await fetchJson(`${API_BASE}${pathName}`);
      if (res.ok && assert(json)) {
        const extra =
          pathName.includes('products') && Array.isArray(json?.products)
            ? `${json.products.length} products`
            : pathName.includes('conversions') && Array.isArray(json?.conversions)
              ? `${json.conversions.length} conversions`
              : `HTTP ${res.status}`;
        ok('backend', label, extra);
      } else {
        fail('backend', label, `HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`);
      }
    } catch (err) {
      fail('backend', label, err.message);
    }
  }

  // Auth guard sanity — protected route should reject without token
  try {
    const { res } = await fetchJson(`${API_BASE}/api/users/me`);
    if (res.status === 401 || res.status === 403) ok('backend', 'Auth guard /api/users/me', `HTTP ${res.status}`);
    else fail('backend', 'Auth guard /api/users/me', `expected 401/403, got ${res.status}`);
  } catch (err) {
    fail('backend', 'Auth guard /api/users/me', err.message);
  }

  return true;
}

async function checkDatabase() {
  section('Backend — MySQL');
  const cfg = {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  };

  if (!cfg.host || !cfg.user || !cfg.database) {
    fail('db', 'Env vars', 'MYSQL_HOST / MYSQL_USER / MYSQL_DATABASE missing');
    return;
  }

  let conn;
  try {
    conn = await mysql.createConnection(cfg);
    ok('db', 'Connection', `${cfg.user}@${cfg.host}/${cfg.database}`);

    const tables = [
      'users',
      'orders',
      'reimagine_requests',
      'waitlist',
      'products',
      'consultation_slots',
      'reimagine_conversions',
    ];
    for (const table of tables) {
      try {
        const [rows] = await conn.query(`SELECT COUNT(*) AS c FROM \`${table}\``);
        ok('db', `Table ${table}`, `${rows[0].c} rows`);
      } catch (err) {
        fail('db', `Table ${table}`, err.message);
      }
    }
  } catch (err) {
    fail('db', 'Connection', err.message);
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}

async function checkSmtpAndTemplates() {
  section('Backend — SMTP & email templates');

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const notifyTo = process.env.NOTIFY_EMAIL || process.env.SMTP_REPLY_TO || 'support@tarajuvva.com';

  if (!host || !user || !pass || !from) {
    fail('email', 'SMTP env', 'SMTP_HOST / SMTP_USER / SMTP_PASS / SMTP_FROM incomplete');
  } else {
    ok('email', 'SMTP env present', `${host} as ${from}`);
    ok('email', 'Admin notify target', notifyTo);

    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const tx = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await tx.verify();
      ok('email', 'SMTP verify()', 'server accepted credentials');
    } catch (err) {
      fail('email', 'SMTP verify()', err.message);
    }
  }

  // Template generation (no network) — load formatters from notifyEmail
  let formatters;
  try {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'utils', 'notifyEmail.js'), 'utf8');
    const wrapped = src.replace(
      'module.exports = {',
      `module.exports = {
  formatOrderCustomerEmail,
  formatReimagineCustomerEmail,
  formatWaitlistCustomerEmail,
  formatOrderEmail,
  formatReimagineRequestEmail,
  formatWaitlistAdminEmail,`
    );
    const Module = require('module');
    const filename = require.resolve('../src/utils/notifyEmail.js');
    const m = new Module(filename);
    m.filename = filename;
    m.paths = Module._nodeModulePaths(path.dirname(filename));
    m._compile(wrapped, filename);
    formatters = m.exports;
    ok('email', 'notifyEmail module load');
  } catch (err) {
    fail('email', 'notifyEmail module load', err.message);
    return;
  }

  const sampleOrder = {
    id: 'verify-order-0001',
    user_name: 'Verify User',
    user_phone: '9999999999',
    user_email: 'verify@example.com',
    total: 999,
    payment_method: 'cod',
    payment_status: 'cod',
    address: 'Test address\nHyderabad',
    items: JSON.stringify([{ name: 'Test Tee', size: 'M', qty: 1, price: 999 }]),
  };

  const sampleReimagine = {
    id: 'verify-reim-0001',
    user_name: 'Verify User',
    user_phone: '9999999999',
    user_email: 'verify@example.com',
    garment_type: 'Saree',
    transformation: 'Dress',
    pickup_date: '2026-08-01',
    payment_status: 'paid',
    consultation_paid: true,
    is_custom: false,
    address: 'Test address',
  };

  const sampleCustom = {
    id: 'verify-custom-0001',
    user_name: 'Verify User',
    user_phone: '9999999999',
    user_email: 'verify@example.com',
    garment_type: 'customize',
    transformation: 'Customize Consultation — Callback requested',
    is_custom: true,
    callback_requested: true,
    payment_status: 'not_required',
    address: 'Test address',
    notes: 'Prefer weekend call',
  };

  const sampleWaitlist = { name: 'Verify User', email: 'verify@example.com', phone: '999', type: 'repair' };

  const cases = [
    ['Order customer HTML', () => formatters.formatOrderCustomerEmail(sampleOrder)],
    ['Order admin HTML', () => formatters.formatOrderEmail(sampleOrder)],
    ['Reimagine customer HTML', () => formatters.formatReimagineCustomerEmail(sampleReimagine)],
    ['Reimagine admin HTML', () => formatters.formatReimagineRequestEmail(sampleReimagine)],
    ['Custom consultation customer HTML', () => formatters.formatReimagineCustomerEmail(sampleCustom)],
    ['Custom consultation admin HTML', () => formatters.formatReimagineRequestEmail(sampleCustom)],
    ['Waitlist customer HTML', () => formatters.formatWaitlistCustomerEmail(sampleWaitlist)],
    ['Waitlist admin HTML', () => formatters.formatWaitlistAdminEmail(sampleWaitlist)],
  ];

  for (const [label, fn] of cases) {
    try {
      const payload = fn();
      const hasHtml = Boolean(payload?.html && payload.html.includes('Tarajuvva'));
      const hasText = Boolean(payload?.text);
      const hasSubject = Boolean(payload?.subject);
      if (hasHtml && hasText && hasSubject) ok('email', label, payload.subject);
      else fail('email', label, `missing ${[!hasSubject && 'subject', !hasText && 'text', !hasHtml && 'html'].filter(Boolean).join(', ')}`);
    } catch (err) {
      fail('email', label, err.message);
    }
  }

  // CTA link checks
  try {
    const orderHtml = formatters.formatOrderCustomerEmail(sampleOrder).html;
    if (orderHtml.includes('/profile/orders/')) ok('email', 'Order CTA contains track link');
    else fail('email', 'Order CTA contains track link');

    const reimHtml = formatters.formatReimagineCustomerEmail(sampleReimagine).html;
    if (reimHtml.includes('/profile/reimagine')) ok('email', 'Reimagine CTA contains profile link');
    else fail('email', 'Reimagine CTA contains profile link');

    const customHtml = formatters.formatReimagineCustomerEmail(sampleCustom).html;
    if (customHtml.toLowerCase().includes('callback') || customHtml.toLowerCase().includes('custom')) {
      ok('email', 'Custom consultation template distinct copy');
    } else {
      fail('email', 'Custom consultation template distinct copy');
    }
  } catch (err) {
    fail('email', 'CTA checks', err.message);
  }

  if (SEND_EMAIL_TO) {
    section(`Live email send → ${SEND_EMAIL_TO}`);
    try {
      const { sendCustomerEmail } = require('../src/utils/notifyEmail');
      const payloads = [
        formatters.formatOrderCustomerEmail({ ...sampleOrder, user_email: SEND_EMAIL_TO }),
        formatters.formatReimagineCustomerEmail({ ...sampleReimagine, user_email: SEND_EMAIL_TO }),
        formatters.formatReimagineCustomerEmail({ ...sampleCustom, user_email: SEND_EMAIL_TO }),
        formatters.formatWaitlistCustomerEmail({ ...sampleWaitlist, email: SEND_EMAIL_TO }),
      ];
      for (const p of payloads) {
        const subject = `[VERIFY] ${p.subject}`;
        const result = await sendCustomerEmail(SEND_EMAIL_TO, { ...p, subject });
        if (result.ok) ok('email-send', subject);
        else fail('email-send', subject, result.error || (result.skipped ? 'SMTP skipped' : 'failed'));
      }
    } catch (err) {
      fail('email-send', 'Send batch', err.message);
    }
  }
}

async function checkFrontend() {
  section('Frontend — pages & API proxy');

  try {
    const { res, text } = await fetchText(WEB_BASE);
    if (res.ok && /html/i.test(res.headers.get('content-type') || '') && text.includes('<div id="root"')) {
      ok('frontend', 'Dev server root', WEB_BASE);
    } else if (res.ok && text.length > 100) {
      ok('frontend', 'Dev server root', `HTTP ${res.status}`);
    } else {
      fail('frontend', 'Dev server root', `HTTP ${res.status}`);
    }
  } catch (err) {
    fail('frontend', 'Dev server root', `${err.message} — is Vite running on ${WEB_BASE}?`);
    return;
  }

  const routes = ['/', '/shop', '/reimagine', '/repair', '/donate', '/about', '/login', '/profile'];
  for (const route of routes) {
    try {
      const { res, text } = await fetchText(`${WEB_BASE}${route}`);
      if (res.ok && text.includes('root')) ok('frontend', `Route ${route}`, `HTTP ${res.status}`);
      else fail('frontend', `Route ${route}`, `HTTP ${res.status}`);
    } catch (err) {
      fail('frontend', `Route ${route}`, err.message);
    }
  }

  // Vite proxies /api → backend
  try {
    const { res, json } = await fetchJson(`${WEB_BASE}/api/health`);
    if (res.ok && json?.success) ok('frontend', 'Vite /api proxy → backend', 'health ok');
    else fail('frontend', 'Vite /api proxy → backend', `HTTP ${res.status}`);
  } catch (err) {
    fail('frontend', 'Vite /api proxy → backend', err.message);
  }
}

function printSummary() {
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log('\n────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed (${results.length} checks)`);
  if (failed) {
    console.log('\nFailed:');
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`  • [${r.section}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
    }
  }
  console.log('────────────────────────────────────────\n');
  return failed === 0;
}

(async () => {
  console.log('Tarajuvva verification');
  console.log(`  API  ${API_BASE}`);
  console.log(`  Web  ${WEB_BASE}`);
  if (SEND_EMAIL_TO) console.log(`  Mail ${SEND_EMAIL_TO}`);

  await checkBackendHealth();
  await checkDatabase();
  await checkSmtpAndTemplates();
  await checkFrontend();

  const allOk = printSummary();
  process.exit(allOk ? 0 : 1);
})().catch((err) => {
  console.error('\nUnexpected error:', err);
  process.exit(1);
});
