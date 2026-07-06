const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { parseImages, pickStorableImage, enrichOrderItems } = require('../lib/orderItems');
const { resolveImagesFromRequest } = require('../lib/productImages');
const { notifyOrder } = require('../utils/notifyEmail');
const { getRazorpayConfig, getRazorpayClient, verifyPaymentSignature, toPaise } = require('../utils/razorpay');
const { getAllSizeCharts, getSizeChart, chartKeyForProduct } = require('../utils/sizeCharts');

const productImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only JPEG, PNG, GIF, or WebP images are allowed.'), ok);
  },
});

function handleProductUpload(req, res, next) {
  productImageUpload.array('images', 12)(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Image upload failed.',
      });
    }
    next();
  });
}

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

    const product = await get('SELECT id, name, price, images FROM products WHERE id = ?', [id]);
    if (!product) {
      const err = new Error(`Product not found: ${id}`);
      err.status = 404;
      throw err;
    }

    const image = pickStorableImage(parseImages(product.images));
    const orderLine = { id: product.id, name: product.name, price: product.price, qty };
    if (image) orderLine.image = image;
    if (line.size) orderLine.size = String(line.size).trim();
    items.push(orderLine);
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
  sizes: parseJsonArray(p.sizes),
  size_type: p.size_type || null,
  garment_type: p.garment_type || null,
});

const LETTER_SIZE_RE = /^(XXS|XS|S|M|L|XL|XXL|XXXL|FREE|[A-Z]{1,4})$/i;
const NUMERIC_SIZE_RE = /^\d{1,2}$/;

function normalizeSizeType(raw) {
  if (raw === 'letter' || raw === 'numeric') return raw;
  return null;
}

function normalizeGarmentType(raw) {
  if (raw === 'top' || raw === 'bottom') return raw;
  return null;
}

/** Validate and normalise sizes array: [{label, available}]. */
function normalizeSizes(raw, sizeType = null) {
  if (!raw || !Array.isArray(raw)) return [];
  const sizes = raw
    .filter((s) => s && typeof s.label === 'string' && s.label.trim())
    .map((s) => {
      const labelRaw = String(s.label).trim();
      const label = sizeType === 'numeric' ? labelRaw : labelRaw.toUpperCase();
      return { label, available: s.available !== false };
    });

  if (sizeType === 'letter') {
    return sizes.filter((s) => LETTER_SIZE_RE.test(s.label));
  }
  if (sizeType === 'numeric') {
    return sizes.filter((s) => NUMERIC_SIZE_RE.test(s.label));
  }
  return sizes;
}

function validateProductSizes(sizeType, garmentType, sizes) {
  if (!sizes.length) return;
  if (!sizeType || !garmentType) {
    const err = new Error('Size type and garment type are required when sizes are set');
    err.status = 400;
    throw err;
  }
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
router.get('/size-charts', async (req, res) => {
  const charts = await getAllSizeCharts();
  res.json({ success: true, charts });
});

router.get('/size-charts/:key', async (req, res) => {
  const chart = await getSizeChart(req.params.key);
  if (!chart) return res.status(404).json({ success: false, message: 'Chart not found' });
  res.json({ success: true, chart });
});

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
  const product = parseProduct(p);
  const chartKey = chartKeyForProduct(product.size_type, product.garment_type);
  let size_chart = null;
  if (chartKey) {
    size_chart = await getSizeChart(chartKey);
  }
  res.json({ success: true, product, size_chart });
});

router.post('/products', authenticateAdmin, handleProductUpload, async (req, res) => {
  let parsed;
  let imgList;
  try {
    ({ data: parsed, images: imgList } = resolveImagesFromRequest(req));
    imgList = normalizeProductImages(imgList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  const { name, price, original_price, category, description, ways_to_wear, tags, stock, featured } = parsed;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const sizeType = normalizeSizeType(parsed.size_type);
  const garmentType = normalizeGarmentType(parsed.garment_type);
  let sizeList;
  try {
    sizeList = normalizeSizes(parsed.sizes, sizeType);
    validateProductSizes(sizeType, garmentType, sizeList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  const id = uuidv4();
  await run(
    `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,stock,sizes,size_type,garment_type,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
      JSON.stringify(sizeList),
      sizeList.length ? sizeType : null,
      sizeList.length ? garmentType : null,
      featured ? 1 : 0,
    ]
  );
  res.status(201).json({ success: true, id });
});

router.put('/products/:id', authenticateAdmin, handleProductUpload, async (req, res) => {
  let parsed;
  let imgList;
  try {
    ({ data: parsed, images: imgList } = resolveImagesFromRequest(req));
    imgList = normalizeProductImages(imgList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  const { name, price, original_price, category, description, ways_to_wear, tags, stock, featured } = parsed;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const sizeType = normalizeSizeType(parsed.size_type);
  const garmentType = normalizeGarmentType(parsed.garment_type);
  let sizeList;
  try {
    sizeList = normalizeSizes(parsed.sizes, sizeType);
    validateProductSizes(sizeType, garmentType, sizeList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const stockNum = Math.max(0, parseInt(String(stock ?? 100), 10) || 0) || 100;
  await run(
    `UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,images=?,tags=?,stock=?,sizes=?,size_type=?,garment_type=?,featured=? WHERE id=?`,
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
      JSON.stringify(sizeList),
      sizeList.length ? sizeType : null,
      sizeList.length ? garmentType : null,
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

/** Admin only — update size availability without touching other fields. */
router.patch('/products/:id/sizes', authenticateAdmin, async (req, res) => {
  const row = await get('SELECT id, size_type FROM products WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Product not found' });
  const sizeList = normalizeSizes(req.body.sizes, row.size_type);
  await run('UPDATE products SET sizes = ? WHERE id = ?', [JSON.stringify(sizeList), req.params.id]);
  res.json({ success: true, sizes: sizeList });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.get('/razorpay/key', (req, res) => {
  const cfg = getRazorpayConfig();
  if (!cfg) return res.status(503).json({ success: false, message: 'Online payments are not configured' });
  res.json({ success: true, key_id: cfg.key_id });
});

router.post('/orders', authenticateUser, async (req, res) => {
  const { user_name, user_email, user_phone, address, items, payment_method, notes } = req.body;
  if (!user_name || !user_phone || !address || !items)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Sign in with a customer account to place orders' });
  }

  const dbUser = await get('SELECT id FROM users WHERE id = ?', [req.user.id]);
  if (!dbUser) {
    return res.status(401).json({ success: false, message: 'Account not found. Please sign in again.' });
  }

  let orderItems;
  let total;
  try {
    ({ items: orderItems, total } = await resolveOrderItems(items));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const method = payment_method === 'razorpay' ? 'razorpay' : 'cod';
  const id = uuidv4();
  const user_id = dbUser.id;

  if (method === 'razorpay') {
    const rzp = getRazorpayClient();
    if (!rzp) {
      return res.status(503).json({ success: false, message: 'Online payments are not configured' });
    }

    await run(
      `INSERT INTO orders (id,user_id,user_name,user_email,user_phone,address,items,total,status,payment_method,payment_status,notes)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id, user_id, user_name, user_email || null, user_phone, address,
        JSON.stringify(orderItems), total, 'pending_payment', 'razorpay', 'pending', notes || null,
      ]
    );

    let rzpOrder;
    try {
      rzpOrder = await rzp.orders.create({
        amount: toPaise(total),
        currency: 'INR',
        receipt: id.slice(0, 32),
        notes: { order_id: id, user_id },
      });
    } catch (err) {
      await run('DELETE FROM orders WHERE id = ?', [id]);
      console.error('[razorpay] order create failed:', err);
      return res.status(502).json({ success: false, message: 'Could not start payment. Please try again.' });
    }

    await run('UPDATE orders SET razorpay_order_id = ? WHERE id = ?', [rzpOrder.id, id]);

    const row = await get('SELECT * FROM orders WHERE id=?', [id]);
    const itemsWithImages = await enrichOrderItems(orderItems, get);
    const cfg = getRazorpayConfig();

    return res.status(201).json({
      success: true,
      order: { ...row, items: itemsWithImages },
      razorpay: {
        key_id: cfg.key_id,
        order_id: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
      },
    });
  }

  await run(
    `INSERT INTO orders (id,user_id,user_name,user_email,user_phone,address,items,total,status,payment_method,payment_status,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, user_id, user_name, user_email || null, user_phone, address,
      JSON.stringify(orderItems), total, 'received', 'cod', 'cod', notes || null,
    ]
  );

  const row = await get('SELECT * FROM orders WHERE id=?', [id]);
  const itemsWithImages = await enrichOrderItems(orderItems, get);
  notifyOrder(row).catch(() => {});
  res.status(201).json({
    success: true,
    message: 'Thank you for shopping with Tarajuvva. Your order is being processed and will be dispatched soon.',
    order: { ...row, items: itemsWithImages },
  });
});

router.post('/orders/:id/razorpay/verify', authenticateUser, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ success: false, message: 'Missing payment details' });
  }

  const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  if (order.user_id !== req.user.id) {
    return res.status(403).json({ success: false, message: 'Not your order' });
  }
  if (order.payment_method !== 'razorpay') {
    return res.status(400).json({ success: false, message: 'Not an online payment order' });
  }
  if (order.payment_status === 'paid') {
    const itemsWithImages = await enrichOrderItems(JSON.parse(order.items), get);
    return res.json({ success: true, message: 'Payment already confirmed', order: { ...order, items: itemsWithImages } });
  }
  if (order.razorpay_order_id && order.razorpay_order_id !== razorpay_order_id) {
    return res.status(400).json({ success: false, message: 'Payment order mismatch' });
  }

  if (!verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
    await run(
      'UPDATE orders SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['failed', req.params.id]
    );
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  await run(
    `UPDATE orders SET status = 'received', payment_status = 'paid', razorpay_order_id = ?, razorpay_payment_id = ?,
     paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [razorpay_order_id, razorpay_payment_id, req.params.id]
  );

  const updated = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  const itemsWithImages = await enrichOrderItems(JSON.parse(updated.items), get);
  notifyOrder(updated).catch(() => {});

  res.json({
    success: true,
    message: 'Payment successful. Your order is being processed and will be dispatched soon.',
    order: { ...updated, items: itemsWithImages },
  });
});

router.get('/orders', authenticateAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let q = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    if (status) {
      q += ' AND status=?';
      params.push(status);
    }
    q += ' ORDER BY created_at DESC';
    const rows = await all(q, params);
    const orders = await Promise.all(
      rows.map(async (o) => ({
        ...o,
        items: await enrichOrderItems(JSON.parse(o.items ?? '[]'), get),
      }))
    );
    res.json({ success: true, orders });
  } catch (err) {
    console.error('[shop] GET /orders failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load orders' });
  }
});

router.patch('/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status } = req.body;
  const valid = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });
  await run('UPDATE orders SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?', [status, req.params.id]);
  res.json({ success: true });
});

module.exports = router;
