const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');

const productImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `prod-${uuidv4()}${ext}`);
  },
});
const productImageUpload = multer({
  storage: productImageStorage,
  limits: { fileSize: 10 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
  },
});

const parseProduct = (p) => ({
  ...p,
  images:       JSON.parse(p.images || '[]'),
  ways_to_wear: JSON.parse(p.ways_to_wear || '[]'),
  tags:         JSON.parse(p.tags || '[]'),
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  const { category, featured, limit } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category) { q += ' AND category = ?'; params.push(category); }
  if (featured) { q += ' AND featured = 1'; }
  q += ' ORDER BY created_at DESC';
  // MySQL + pool.execute() rejects bound parameters for LIMIT on some servers (ER_WRONG_ARGUMENTS / stmt_execute).
  if (limit != null && limit !== '') {
    const lim = Math.min(Math.max(0, parseInt(String(limit), 10) || 0), 500);
    if (lim > 0) q += ` LIMIT ${lim}`;
  }
  const rows = await all(q, params);
  res.json({ success: true, products: rows.map(parseProduct) });
});

router.post(
  '/products/upload-images',
  authenticateAdmin,
  (req, res, next) => {
    productImageUpload.array('images', 12)(req, res, (err) => {
      if (err) return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
      next();
    });
  },
  (req, res) => {
    const urls = (req.files || []).map((f) => `/uploads/${f.filename}`);
    if (urls.length === 0) return res.status(400).json({ success: false, message: 'No image files received' });
    res.json({ success: true, urls });
  }
);

router.get('/products/:id', async (req, res) => {
  const p = await get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!p) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, product: parseProduct(p) });
});

router.post('/products', authenticateAdmin, async (req, res) => {
  const { name, price, original_price, category, description, ways_to_wear, images, tags, stock, featured } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const imgList = Array.isArray(images) ? images.map((u) => String(u).trim()).filter(Boolean) : [];
  if (imgList.length === 0) return res.status(400).json({ success: false, message: 'At least one image URL is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  const id = uuidv4();
  await run(
    `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, String(name).trim(), priceNum, original_price == null || original_price === '' ? null : Number(original_price), String(category).trim(), description ? String(description).trim() : null, JSON.stringify(ways), JSON.stringify(imgList), JSON.stringify(tagList), stockNum, featured ? 1 : 0]
  );
  res.status(201).json({ success: true, id });
});

router.put('/products/:id', authenticateAdmin, async (req, res) => {
  const { name, price, original_price, category, description, ways_to_wear, images, tags, stock, featured } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const imgList = Array.isArray(images) ? images.map((u) => String(u).trim()).filter(Boolean) : [];
  if (imgList.length === 0) return res.status(400).json({ success: false, message: 'At least one image URL is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  await run(
    `UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,images=?,tags=?,stock=?,featured=? WHERE id=?`,
    [String(name).trim(), priceNum, original_price == null || original_price === '' ? null : Number(original_price), String(category).trim(), description ? String(description).trim() : null, JSON.stringify(ways), JSON.stringify(imgList), JSON.stringify(tagList), stockNum, featured ? 1 : 0, req.params.id]
  );
  res.json({ success: true });
});

router.delete('/products/:id', authenticateAdmin, async (req, res) => {
  await run('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.post('/orders', optionalAuth, async (req, res) => {
  const { user_name, user_email, user_phone, address, items, total, payment_method, notes } = req.body;
  if (!user_name || !user_phone || !address || !items || !total)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  const id = uuidv4();
  const user_id = req.user?.id || null;
  await run(
    `INSERT INTO orders (id,user_id,user_name,user_email,user_phone,address,items,total,payment_method,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, user_id, user_name, user_email || null, user_phone, address, JSON.stringify(items), total, payment_method || 'cod', notes || null]
  );

  const row = await get('SELECT * FROM orders WHERE id=?', [id]);
  res.status(201).json({
    success: true,
    message: 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.',
    order: { ...row, items }
  });
});

router.get('/orders', authenticateAdmin, async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { q += ' AND status=?'; params.push(status); }
  q += ' ORDER BY created_at DESC';
  const rows = await all(q, params);
  res.json({ success: true, orders: rows.map(o => ({ ...o, items: JSON.parse(o.items) })) });
});

router.patch('/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['received','processing','shipped','delivered','cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  await run('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
