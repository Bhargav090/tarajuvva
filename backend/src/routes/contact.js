const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { get, run, all } = require('../db/database');
const { authenticateAdmin } = require('../middleware/auth');
const { notifyContactInquiry } = require('../utils/notifyEmail');

const CONTACT_STATUSES = ['new', 'reached_out'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// Public: submit Get in Touch form
router.post('/', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const phone = String(req.body?.phone || '').trim() || null;
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and message are required',
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address' });
  }

  if (message.length > 4000) {
    return res.status(400).json({ success: false, message: 'Message is too long (max 4000 characters)' });
  }

  const id = uuidv4();
  await run(
    `INSERT INTO contact_inquiries (id, name, email, phone, message, status)
     VALUES (?, ?, ?, ?, ?, 'new')`,
    [id, name, email, phone, message]
  );

  const entry = { id, name, email, phone, message, status: 'new' };
  notifyContactInquiry(entry).catch((err) => {
    console.error('[contact] notify failed:', err.message || err);
  });

  res.status(201).json({
    success: true,
    message: 'Thanks — we got your message and will get back to you soon.',
    id,
  });
});

// Admin: list inquiries
router.get('/', authenticateAdmin, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM contact_inquiries WHERE 1=1';
  const params = [];
  if (status && CONTACT_STATUSES.includes(String(status))) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC';
  const entries = await all(query, params);
  res.json({ success: true, entries });
});

// Admin: update status (new ↔ reached_out)
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!CONTACT_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${CONTACT_STATUSES.join(', ')}`,
    });
  }
  const row = await get('SELECT id FROM contact_inquiries WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Inquiry not found' });

  await run(
    'UPDATE contact_inquiries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [status, req.params.id]
  );
  res.json({ success: true, id: req.params.id, status });
});

module.exports = router;
