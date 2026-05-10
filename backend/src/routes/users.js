const express = require('express');
const router  = express.Router();
const { authenticateAdmin } = require('../middleware/auth');
const { get, run, all } = require('../db/database');

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
  const orders = await all('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const parsed = orders.map(o => ({ ...o, items: JSON.parse(o.items) }));
  res.json({ success: true, orders: parsed });
});

// ── MY REIMAGINE REQUESTS ─────────────────────────────────────────────────────
router.get('/me/reimagine', authenticateUser, async (req, res) => {
  const requests = await all('SELECT * FROM reimagine_requests WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  const parsed = requests.map(r => ({ ...r, images: JSON.parse(r.images || '[]') }));
  res.json({ success: true, requests: parsed });
});

// ── ADMIN: all users ──────────────────────────────────────────────────────────
router.get('/', authenticateAdmin, async (req, res) => {
  const users = await all('SELECT id,name,email,avatar,phone,role,created_at FROM users ORDER BY created_at DESC');
  res.json({ success: true, users });
});

module.exports = router;
