const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, optionalAuth } = require('../middleware/auth');

/** Max serialized length per image string (base64 data URLs can be large). */
const MAX_IMAGE_STRING = 20 * 1024 * 1024;
const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;
const LEGACY_SRC_RE = /^(https?:\/\/|\/uploads\/)/i;

function parseJsonArray(str, fallback = '[]') {
  try {
    const v = JSON.parse(str ?? fallback);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Resolve cart lines to a compact order snapshot (id, name, price, qty) from the DB. */
async function resolveOrderItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    const err = new Error('Order must include at least one item');
    err.status = 400;
    throw err;
  }

  const items = [];
  let total = 0;

  for (const line of rawItems) {
    const id = line.id || line.product_id;
    const qty = Math.max(1, parseInt(line.qty, 10) || 1);
    if (!id) {
      const err = new Error('Each item must include a product id');
      err.status = 400;
      throw err;
    }

    const product = await get('SELECT id, name, price FROM products WHERE id = ?', [id]);
    if (!product) {
      const err = new Error(`Product not found: ${id}`);
      err.status = 404;
      throw err;
    }

    items.push({ id: product.id, name: product.name, price: product.price, qty });
    total += product.price * qty;
  }

  return { items, total };
}

/**
 * Normalizes `images` to a non-empty array of strings.
 * Preferred: `data:image/<type>;base64,...` (stored in DB as JSON).
 * Legacy seed / old rows: `https://...` or `/uploads/...` still accepted.
 */
function normalizeProductImages(images) {
  const arr = Array.isArray(images) ? images : [];
  const out = [];
  for (let s of arr) {
    s = String(s || '').trim();
    if (!s) continue;
    if (s.length > MAX_IMAGE_STRING) {
      const err = new Error('One or more images exceed maximum size (20MB each serialized)');
      err.status = 400;
      throw err;
    }
    if (DATA_URL_RE.test(s)) {
      out.push(s);
    } else if (LEGACY_SRC_RE.test(s)) {
      out.push(s);
    } else {
      const err = new Error(
        'Each image must be a base64 data URL (data:image/png|jpeg|gif|webp;base64,...) or a legacy http(s) / /uploads/ URL'
      );
      err.status = 400;
      throw err;
    }
  }
  if (out.length === 0) {
    const err = new Error('At least one product image is required');
    err.status = 400;
    throw err;
  }
  return out;
}

const parseProduct = (p) => ({
  ...p,
  images: parseJsonArray(p.images),
  ways_to_wear: parseJsonArray(p.ways_to_wear),
  tags: parseJsonArray(p.tags),
});

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
router.get('/products', async (req, res) => {
  const { category, featured, limit } = req.query;
  let q = 'SELECT * FROM products WHERE 1=1';
  const params = [];
  if (category) {
    q += ' AND category = ?';
    params.push(category);
  }
  if (featured) {
    q += ' AND featured = 1';
  }
  q += ' ORDER BY created_at DESC';
  if (limit != null && limit !== '') {
    const lim = Math.min(Math.max(0, parseInt(String(limit), 10) || 0), 500);
    if (lim > 0) q += ` LIMIT ${lim}`;
  }
  const rows = await all(q, params);
  res.json({ success: true, products: rows.map(parseProduct) });
});

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
  let imgList;
  try {
    imgList = normalizeProductImages(images);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  const id = uuidv4();
  await run(
    `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      String(name).trim(),
      priceNum,
      original_price == null || original_price === '' ? null : Number(original_price),
      String(category).trim(),
      description ? String(description).trim() : null,
      JSON.stringify(ways),
      JSON.stringify(imgList),
      JSON.stringify(tagList),
      stockNum,
      featured ? 1 : 0,
    ]
  );
  res.status(201).json({ success: true, id });
});

router.put('/products/:id', authenticateAdmin, async (req, res) => {
  const { name, price, original_price, category, description, ways_to_wear, images, tags, stock, featured } = req.body;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  let imgList;
  try {
    imgList = normalizeProductImages(images);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  await run(
    `UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,images=?,tags=?,stock=?,featured=? WHERE id=?`,
    [
      String(name).trim(),
      priceNum,
      original_price == null || original_price === '' ? null : Number(original_price),
      String(category).trim(),
      description ? String(description).trim() : null,
      JSON.stringify(ways),
      JSON.stringify(imgList),
      JSON.stringify(tagList),
      stockNum,
      featured ? 1 : 0,
      req.params.id,
    ]
  );
  res.json({ success: true });
});

router.delete('/products/:id', authenticateAdmin, async (req, res) => {
  await run('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.post('/orders', optionalAuth, async (req, res) => {
  const { user_name, user_email, user_phone, address, items, payment_method, notes } = req.body;
  if (!user_name || !user_phone || !address || !items)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  let orderItems;
  let total;
  try {
    ({ items: orderItems, total } = await resolveOrderItems(items));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const id = uuidv4();
  const user_id = req.user?.id || null;
  await run(
    `INSERT INTO orders (id,user_id,user_name,user_email,user_phone,address,items,total,payment_method,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, user_id, user_name, user_email || null, user_phone, address, JSON.stringify(orderItems), total, payment_method || 'cod', notes || null]
  );

  const row = await get('SELECT * FROM orders WHERE id=?', [id]);
  res.status(201).json({
    success: true,
    message: 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.',
    order: { ...row, items: orderItems },
  });
});

router.get('/orders', authenticateAdmin, async (req, res) => {
  const { status } = req.query;
  let q = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) {
    q += ' AND status=?';
    params.push(status);
  }
  q += ' ORDER BY created_at DESC';
  const rows = await all(q, params);
  res.json({ success: true, orders: rows.map((o) => ({ ...o, items: JSON.parse(o.items) })) });
});

router.patch('/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  await run('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
