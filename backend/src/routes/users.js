const express = require('express');
const router  = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { get, run, all } = require('../db/database');
const { enrichOrderItems } = require('../lib/orderItems');

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
  const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const parsed = await Promise.all(
    orders.map(async (o) => ({
      ...o,
      items: await enrichOrderItems(JSON.parse(o.items), get),
    }))
  );
  res.json({ success: true, orders: parsed });
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
  const requests = await all('SELECT * FROM reimagine_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const parsed = requests.map(r => ({
    ...r,
    is_custom: Boolean(r.is_custom),
    images: JSON.parse(r.images || '[]'),
  }));
  res.json({ success: true, requests: parsed });
});

// ── ADMIN: all users ──────────────────────────────────────────────────────────
router.get('/', authenticateAdmin, async (req, res) => {
  const users = await all('SELECT id,name,email,avatar,phone,role,created_at FROM users ORDER BY created_at DESC');
  res.json({ success: true, users });
});

module.exports = router;
