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
        conversion_id, notes, garment_size, transformation_size, height_ft, height_in,
        status, admin_notes, pickup_date, pickup_period, payment_status, consultation_fee,
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

// ── WISHLIST ──────────────────────────────────────────────────────────────────
function parseWishlistProduct(p) {
  let images = [];
  let tags = [];
  let sizes = [];
  try { images = JSON.parse(p.images || '[]'); } catch { images = []; }
  try { tags = JSON.parse(p.tags || '[]'); } catch { tags = []; }
  try { sizes = JSON.parse(p.sizes || '[]'); } catch { sizes = []; }
  if (!Array.isArray(images)) images = [];
  if (!Array.isArray(tags)) tags = [];
  if (!Array.isArray(sizes)) sizes = [];
  return {
    ...p,
    images,
    tags,
    sizes,
    price: Number(p.price) || 0,
    original_price: p.original_price != null ? Number(p.original_price) : null,
    stock: Number(p.stock) || 0,
    featured: Boolean(p.featured),
    image_tag: (p.image_tag && String(p.image_tag).trim()) || null,
  };
}

router.get('/me/wishlist', authenticateUser, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Customer account required' });
  }
  try {
    const rows = await all(
      `SELECT p.*, w.created_at AS wishlisted_at
       FROM wishlists w
       JOIN products p ON p.id = w.product_id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json({
      success: true,
      products: rows.map(parseWishlistProduct),
      product_ids: rows.map((r) => r.id),
    });
  } catch (err) {
    console.error('[users] GET /me/wishlist failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load wishlist' });
  }
});

router.post('/me/wishlist/:productId', authenticateUser, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Customer account required' });
  }
  try {
    const productId = String(req.params.productId || '').trim();
    const product = await get('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    await run(
      'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [req.user.id, productId]
    );
    res.status(201).json({ success: true, product_id: productId, wishlisted: true });
  } catch (err) {
    console.error('[users] POST /me/wishlist failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to save wishlist' });
  }
});

router.delete('/me/wishlist/:productId', authenticateUser, async (req, res) => {
  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Customer account required' });
  }
  try {
    const productId = String(req.params.productId || '').trim();
    await run('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [req.user.id, productId]);
    res.json({ success: true, product_id: productId, wishlisted: false });
  } catch (err) {
    console.error('[users] DELETE /me/wishlist failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update wishlist' });
  }
});

// ── ADMIN: all users ──────────────────────────────────────────────────────────
router.get('/', authenticateAdmin, async (req, res) => {
  const users = await all('SELECT id,name,email,avatar,phone,role,created_at FROM users ORDER BY created_at DESC');
  res.json({ success: true, users });
});

module.exports = router;
