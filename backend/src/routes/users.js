const express = require('express');
const router  = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { get, run, all } = require('../db/database');
const { enrichOrderItems } = require('../lib/orderItems');
const { normalizeReimagineRequest } = require('../utils/consultationSlots');
const { parsePagination, paginationMeta } = require('../lib/pagination');

// ── AUTH MIDDLEWARE (user-level) ──────────────────────────────────────────────
const jwt = require('jsonwebtoken');

const authenticateUser = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: 'Login required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ success: false, message: 'Invalid token' });
  }
};

// ── GET MY PROFILE ────────────────────────────────────────────────────────────
router.get('/me', authenticateUser, async (req, res) => {
  const user = await get('SELECT id,name,email,avatar,phone,address,role,created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  res.json({ success: true, user });
});

// ── UPDATE PROFILE ────────────────────────────────────────────────────────────
router.put('/me', authenticateUser, async (req, res) => {
  const { name, phone, address } = req.body;
  await run('UPDATE users SET name=?, phone=?, address=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [name, phone, address, req.user.id]);
  const user = await get('SELECT id,name,email,avatar,phone,address,role,created_at FROM users WHERE id=?', [req.user.id]);
  res.json({ success: true, user });
});

// ── MY ORDERS ─────────────────────────────────────────────────────────────────
router.get('/me/orders', authenticateUser, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Customer account required' });
  }
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const countRow = await get(
      'SELECT COUNT(*) AS total FROM orders WHERE user_id = ?',
      [req.user.id]
    );
    const total = Number(countRow?.total) || 0;
    const orders = await all(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      [req.user.id]
    );
    const parsed = await Promise.all(
      orders.map(async (o) => ({
        ...o,
        items: await enrichOrderItems(JSON.parse(o.items), get),
      }))
    );
    res.json({
      success: true,
      orders: parsed,
      pagination: paginationMeta({ page, limit, total }),
    });
  } catch (err) {
    console.error('[users] GET /me/orders failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load orders' });
  }
});

router.get('/me/orders/:id', authenticateUser, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Customer account required' });
  }
  const order = await get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const items = await enrichOrderItems(JSON.parse(order.items), get);
  res.json({ success: true, order: { ...order, items } });
});

// ── MY REIMAGINE REQUESTS ─────────────────────────────────────────────────────
router.get('/me/reimagine', authenticateUser, async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const countRow = await get(
      'SELECT COUNT(*) AS total FROM reimagine_requests WHERE user_id = ?',
      [req.user.id]
    );
    const total = Number(countRow?.total) || 0;

    // List without images column — fetch photos lazily via /me/reimagine/:id/images
    const requests = await all(
      `SELECT
        id, user_id, user_name, user_phone, user_email, address, garment_type, transformation,
        conversion_id, notes, status, admin_notes, pickup_date, payment_status, consultation_fee,
        is_custom, consultation_paid, callback_requested, consultation_date, consultation_time,
        consultation_slot_id, created_at, updated_at,
        CASE
          WHEN images IS NULL OR TRIM(images) IN ('', '[]', 'null') THEN 0
          ELSE JSON_LENGTH(images)
        END AS image_count
       FROM reimagine_requests
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      [req.user.id]
    );

    const parsed = requests.map((r) => {
      const normalized = normalizeReimagineRequest(r);
      const { image_count, ...rest } = normalized;
      return {
        ...rest,
        is_custom: Boolean(r.is_custom),
        callback_requested: Boolean(r.callback_requested),
        consultation_paid: Boolean(r.consultation_paid),
        image_count: Number(image_count) || 0,
        images: [],
      };
    });

    res.json({
      success: true,
      requests: parsed,
      pagination: paginationMeta({ page, limit, total }),
    });
  } catch (err) {
    console.error('[users] GET /me/reimagine failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load requests' });
  }
});

router.get('/me/reimagine/:id/images', authenticateUser, async (req, res) => {
  try {
    const row = await get(
      'SELECT id, images FROM reimagine_requests WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!row) return res.status(404).json({ success: false, message: 'Request not found' });
    let images = [];
    try {
      images = JSON.parse(row.images || '[]');
      if (!Array.isArray(images)) images = [];
    } catch {
      images = [];
    }
    res.json({ success: true, id: row.id, images });
  } catch (err) {
    console.error('[users] GET /me/reimagine/:id/images failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load images' });
  }
});

// ── ADMIN: all users ──────────────────────────────────────────────────────────
router.get('/', authenticateAdmin, async (req, res) => {
  const users = await all('SELECT id,name,email,avatar,phone,role,created_at FROM users ORDER BY created_at DESC');
  res.json({ success: true, users });
});

module.exports = router;
