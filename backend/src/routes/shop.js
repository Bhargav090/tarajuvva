const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');

const parseProduct = (p) => ({
  ...p,
  images:       JSON.parse(p.images || '[]'),
  ways_to_wear: JSON.parse(p.ways_to_wear || '[]'),
  tags:         JSON.parse(p.tags || '[]'),
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
router.get('/products', (req, res) => {
  const { category, featured, limit } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category) { q += ' AND category = ?'; params.push(category); }
  if (featured) { q += ' AND featured = 1'; }
  q += ' ORDER BY created_at DESC';
  if (limit) { q += ' LIMIT ?'; params.push(parseInt(limit)); }
  res.json({ success: true, products: db.prepare(q).all(...params).map(parseProduct) });
});

router.get('/products/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, product: parseProduct(p) });
});

router.post('/products', authenticateAdmin, (req, res) => {
  const { name, price, original_price, category, description, ways_to_wear, images, tags, stock, featured } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, name, price, original_price||null, category, description||null, JSON.stringify(ways_to_wear||[]), JSON.stringify(images||[]), JSON.stringify(tags||[]), stock||100, featured?1:0);
  res.status(201).json({ success: true, id });
});

router.put('/products/:id', authenticateAdmin, (req, res) => {
  const { name, price, original_price, category, description, ways_to_wear, images, tags, stock, featured } = req.body;
  db.prepare(`UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,images=?,tags=?,stock=?,featured=? WHERE id=?`)
    .run(name, price, original_price||null, category, description||null, JSON.stringify(ways_to_wear||[]), JSON.stringify(images||[]), JSON.stringify(tags||[]), stock||100, featured?1:0, req.params.id);
  res.json({ success: true });
});

router.delete('/products/:id', authenticateAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.post('/orders', optionalAuth, (req, res) => {
  const { user_name, user_email, user_phone, address, items, total, payment_method, notes } = req.body;
  if (!user_name || !user_phone || !address || !items || !total)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  const id = uuidv4();
  const user_id = req.user?.id || null;
  db.prepare(`INSERT INTO orders (id,user_id,user_name,user_email,user_phone,address,items,total,payment_method,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, user_id, user_name, user_email||null, user_phone, address, JSON.stringify(items), total, payment_method||'cod', notes||null);

  res.status(201).json({
    success: true,
    message: 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.',
    order: { ...db.prepare('SELECT * FROM orders WHERE id=?').get(id), items }
  });
});

router.get('/orders', authenticateAdmin, (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  res.json({ success: true, orders: db.prepare(q).all(...params).map(o => ({ ...o, items: JSON.parse(o.items) })) });
});

router.patch('/orders/:id/status', authenticateAdmin, (req, res) => {
  const { status } = req.body;
  const valid = ['received','processing','shipped','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  db.prepare('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').run(status, req.params.id);
  res.json({ success: true });
});

module.exports = router;
