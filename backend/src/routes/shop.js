const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { parseImages, pickStorableImage, enrichOrderItems } = require('../lib/orderItems');
const { parsePagination, paginationMeta } = require('../lib/pagination');
const { resolveImagesFromRequest, saveDataUrlProductImage } = require('../lib/productImages');
const { notifyOrder } = require('../utils/notifyEmail');
const { getRazorpayConfig, getRazorpayClient, verifyPaymentSignature, toPaise } = require('../utils/razorpay');
const { getAllSizeCharts, getSizeChart, chartKeyForProduct } = require('../utils/sizeCharts');
const { normalizeDeliveryZone, getDeliveryFee, DELIVERY_ZONE_LABELS } = require('../utils/delivery');

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

function maybeProductUpload(req, res, next) {
  const ct = String(req.headers['content-type'] || '');
  if (ct.includes('multipart/form-data')) {
    return handleProductUpload(req, res, next);
  }
  next();
}

/**
 * Multipart (`data` + `images` files) or legacy JSON body (`name`, `images`, …).
 */
function resolveProductSave(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : null;
  if (!body) {
    const err = new Error('Invalid product request. Refresh the admin page and try again.');
    err.status = 400;
    throw err;
  }

  if (body.data != null && body.data !== '') {
    const dataField = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);
    return resolveImagesFromRequest({ ...req, body: { ...body, data: dataField } });
  }

  if (body.name) {
    return { data: body, images: body.images || [] };
  }

  const err = new Error('Invalid product request. Refresh the admin page and try again.');
  err.status = 400;
  throw err;
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

    const product = await get('SELECT id, name, price, images, stock, sizes FROM products WHERE id = ?', [id]);
    if (!product) {
      const err = new Error(`Product not found: ${id}`);
      err.status = 404;
      throw err;
    }

    const sizeLabel = line.size ? String(line.size).trim() : '';
    const sizes = parseJsonArray(product.sizes);
    if (sizes.length > 0) {
      if (!sizeLabel) {
        const err = new Error(`Please select a size for ${product.name}`);
        err.status = 400;
        throw err;
      }
      const sizeRow = sizes.find((s) => String(s.label).toUpperCase() === sizeLabel.toUpperCase());
      if (!sizeRow) {
        const err = new Error(`Size ${sizeLabel} is not available for ${product.name}`);
        err.status = 400;
        throw err;
      }
      const sizeStock =
        typeof sizeRow.stock === 'number'
          ? sizeRow.stock
          : sizeRow.available === false
            ? 0
            : Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
      if (sizeStock < qty) {
        const err = new Error(
          sizeStock <= 0
            ? `${product.name} (${sizeLabel}) is out of stock`
            : `Only ${sizeStock} left for ${product.name} (${sizeLabel})`
        );
        err.status = 400;
        throw err;
      }
    } else {
      const stockNum = Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
      if (stockNum < qty) {
        const err = new Error(
          stockNum <= 0 ? `${product.name} is out of stock` : `Only ${stockNum} left for ${product.name}`
        );
        err.status = 400;
        throw err;
      }
    }

    const image = pickStorableImage(parseImages(product.images));
    const orderLine = { id: product.id, name: product.name, price: product.price, qty };
    if (image) orderLine.image = image;
    if (sizeLabel) orderLine.size = sizeLabel;
    items.push(orderLine);
    total += product.price * qty;
  }

  return { items, total };
}

async function decrementStockForOrder(orderItems) {
  if (!Array.isArray(orderItems)) return;
  for (const line of orderItems) {
    const product = await get('SELECT id, stock, sizes FROM products WHERE id = ?', [line.id]);
    if (!product) continue;
    const qty = Math.max(1, parseInt(line.qty, 10) || 1);
    const sizes = parseJsonArray(product.sizes);
    if (sizes.length > 0 && line.size) {
      const next = sizes.map((s) => {
        if (String(s.label).toUpperCase() !== String(line.size).toUpperCase()) {
          const stock =
            typeof s.stock === 'number'
              ? Math.max(0, Math.floor(s.stock))
              : s.available === false
                ? 0
                : 1;
          return { label: s.label, stock, available: stock > 0 };
        }
        const prev =
          typeof s.stock === 'number'
            ? s.stock
            : s.available === false
              ? 0
              : Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
        const stock = Math.max(0, prev - qty);
        return { label: s.label, stock, available: stock > 0 };
      });
      const total = next.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
      await run('UPDATE products SET sizes = ?, stock = ? WHERE id = ?', [
        JSON.stringify(next),
        total,
        product.id,
      ]);
    } else {
      const prev = Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
      await run('UPDATE products SET stock = ? WHERE id = ?', [Math.max(0, prev - qty), product.id]);
    }
  }
}

/**
 * Normalizes `images` to a non-empty array of storable references.
 * New uploads: `/uploads/products/...` on disk. Legacy rows may still have https URLs.
 * Base64 data URLs are converted to disk files so the DB stays small.
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
      const saved = saveDataUrlProductImage(s);
      if (!saved) {
        const err = new Error('Could not process one or more uploaded images');
        err.status = 400;
        throw err;
      }
      out.push(saved);
    } else if (LEGACY_SRC_RE.test(s)) {
      out.push(s);
    } else {
      const err = new Error(
        'Each image must be a valid upload, base64 data URL, or legacy http(s) / /uploads/ URL'
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

function productDbErrorMessage(err) {
  if (!err) return 'Could not save product';
  if (err.code === 'ECONNRESET' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ETIMEDOUT') {
    return 'Database connection lost. Please try again in a few seconds.';
  }
  if (err.code === 'ER_DATA_TOO_LONG') {
    return 'Product data is too large. Use fewer or smaller images (max 6MB each).';
  }
  return err.sqlMessage || err.message || 'Could not save product';
}

const parseProduct = (p) => ({
  ...p,
  images: parseJsonArray(p.images),
  ways_to_wear: parseJsonArray(p.ways_to_wear),
  tags: parseJsonArray(p.tags),
  sizes: parseJsonArray(p.sizes),
  size_type: p.size_type || null,
  garment_type: p.garment_type || null,
  image_tag: (p.image_tag && String(p.image_tag).trim()) || null,
});

/** Letter sizes: XS–XXXL, FREE, short codes, or ranges like S-M / M-L. */
const LETTER_TOKEN = '(?:XXS|XS|S|M|L|XL|XXL|XXXL|FREE|[A-Z]{1,4})';
const LETTER_SIZE_RE = new RegExp(`^${LETTER_TOKEN}(?:-${LETTER_TOKEN})?$`, 'i');
const NUMERIC_SIZE_RE = /^\d{1,2}$/;

function normalizeSizeType(raw) {
  if (raw === 'letter' || raw === 'numeric') return raw;
  return null;
}

function normalizeGarmentType(raw) {
  if (raw === 'top' || raw === 'bottom') return raw;
  return null;
}

/** Validate and normalise sizes array: [{label, stock, available}]. */
function normalizeSizes(raw, sizeType = null) {
  if (!raw || !Array.isArray(raw)) return [];
  const sizes = raw
    .filter((s) => s && typeof s.label === 'string' && s.label.trim())
    .map((s) => {
      const labelRaw = String(s.label).trim();
      // Keep hyphen ranges (S-M); collapse other whitespace
      const label =
        sizeType === 'numeric'
          ? labelRaw
          : labelRaw.replace(/\s+/g, '').toUpperCase();
      let stock;
      if (typeof s.stock === 'number' && Number.isFinite(s.stock)) {
        stock = Math.max(0, Math.floor(s.stock));
      } else if (s.stock != null && String(s.stock).trim() !== '') {
        stock = Math.max(0, parseInt(String(s.stock), 10) || 0);
      } else if (s.available === false) {
        stock = 0;
      } else {
        stock = 1;
      }
      return { label, stock, available: stock > 0 };
    });

  if (sizeType === 'letter') {
    return sizes.filter((s) => LETTER_SIZE_RE.test(s.label));
  }
  if (sizeType === 'numeric') {
    return sizes.filter((s) => NUMERIC_SIZE_RE.test(s.label));
  }
  return sizes;
}

function assertSizesAccepted(raw, normalized, sizeType) {
  if (!raw || !Array.isArray(raw) || !sizeType) return;
  const incoming = raw.filter((s) => s && typeof s.label === 'string' && s.label.trim()).length;
  if (incoming > 0 && normalized.length < incoming) {
    const err = new Error(
      sizeType === 'numeric'
        ? 'Invalid size label. Numeric sizes must be 1–2 digit numbers (e.g. 28, 32).'
        : 'Invalid size label. Use letter sizes (XS–XXXL) or ranges like S-M, M-L.'
    );
    err.status = 400;
    throw err;
  }
}

function totalStockFromSizes(sizeList, fallbackStock) {
  if (Array.isArray(sizeList) && sizeList.length > 0) {
    return sizeList.reduce((sum, s) => sum + (Number(s.stock) || 0), 0);
  }
  return Math.max(0, parseInt(String(fallbackStock ?? 100), 10) || 0) || 100;
}

function normalizeImageTag(raw) {
  const t = String(raw ?? '').trim();
  return t || null;
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
  q += ' ORDER BY featured DESC, created_at DESC';
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

router.post('/products', maybeProductUpload, authenticateAdmin, async (req, res) => {
  let parsed;
  let imgList;
  try {
    ({ data: parsed, images: imgList } = resolveProductSave(req));
    imgList = normalizeProductImages(imgList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid product data' });
  }

  const { name, price, original_price, category, description, ways_to_wear, tags, stock, featured } = parsed;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const imageTag = normalizeImageTag(parsed.image_tag);
  const sizeType = normalizeSizeType(parsed.size_type);
  const garmentType = normalizeGarmentType(parsed.garment_type);
  let sizeList;
  try {
    sizeList = normalizeSizes(parsed.sizes, sizeType);
    assertSizesAccepted(parsed.sizes, sizeList, sizeType);
    validateProductSizes(sizeType, garmentType, sizeList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const stockNum = totalStockFromSizes(sizeList, stock);
  const id = uuidv4();
  try {
    await run(
      `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,images,tags,image_tag,stock,sizes,size_type,garment_type,featured) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
        imageTag,
        stockNum,
        JSON.stringify(sizeList),
        sizeList.length ? sizeType : null,
        sizeList.length ? garmentType : null,
        featured ? 1 : 0,
      ]
    );
  } catch (err) {
    console.error('Product create failed:', err);
    return res.status(500).json({ success: false, message: productDbErrorMessage(err) });
  }
  res.status(201).json({ success: true, id });
});

router.put('/products/:id', maybeProductUpload, authenticateAdmin, async (req, res) => {
  let parsed;
  let imgList;
  try {
    ({ data: parsed, images: imgList } = resolveProductSave(req));
    imgList = normalizeProductImages(imgList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }

  if (!parsed || typeof parsed !== 'object') {
    return res.status(400).json({ success: false, message: 'Invalid product data' });
  }

  const { name, price, original_price, category, description, ways_to_wear, tags, stock, featured } = parsed;
  if (!name || !String(name).trim()) return res.status(400).json({ success: false, message: 'Name is required' });
  const priceNum = Number(price);
  if (Number.isNaN(priceNum) || priceNum < 0) return res.status(400).json({ success: false, message: 'Valid price is required' });
  if (!category || !String(category).trim()) return res.status(400).json({ success: false, message: 'Category is required' });
  const ways = Array.isArray(ways_to_wear) ? ways_to_wear.map((w) => String(w).trim()).filter(Boolean) : [];
  const tagList = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const imageTag = normalizeImageTag(parsed.image_tag);
  const sizeType = normalizeSizeType(parsed.size_type);
  const garmentType = normalizeGarmentType(parsed.garment_type);
  let sizeList;
  try {
    sizeList = normalizeSizes(parsed.sizes, sizeType);
    assertSizesAccepted(parsed.sizes, sizeList, sizeType);
    validateProductSizes(sizeType, garmentType, sizeList);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const stockNum = totalStockFromSizes(sizeList, stock);
  try {
    await run(
      `UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,images=?,tags=?,image_tag=?,stock=?,sizes=?,size_type=?,garment_type=?,featured=? WHERE id=?`,
      [
        String(name).trim(),
        priceNum,
        original_price == null || original_price === '' ? null : Number(original_price),
        String(category).trim(),
        description ? String(description).trim() : null,
        JSON.stringify(ways),
        JSON.stringify(imgList),
        JSON.stringify(tagList),
        imageTag,
        stockNum,
        JSON.stringify(sizeList),
        sizeList.length ? sizeType : null,
        sizeList.length ? garmentType : null,
        featured ? 1 : 0,
        req.params.id,
      ]
    );
  } catch (err) {
    console.error('Product update failed:', err);
    return res.status(500).json({ success: false, message: productDbErrorMessage(err) });
  }
  res.json({ success: true });
});

router.delete('/products/:id', authenticateAdmin, async (req, res) => {
  await run('DELETE FROM products WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

/** Admin only — update size availability / stock without touching other fields. */
router.patch('/products/:id/sizes', authenticateAdmin, async (req, res) => {
  const row = await get('SELECT id, size_type FROM products WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ success: false, message: 'Product not found' });
  let sizeList;
  try {
    sizeList = normalizeSizes(req.body.sizes, row.size_type);
    assertSizesAccepted(req.body.sizes, sizeList, row.size_type);
  } catch (e) {
    return res.status(e.status || 400).json({ success: false, message: e.message });
  }
  const stockNum = totalStockFromSizes(sizeList, 0);
  await run('UPDATE products SET sizes = ?, stock = ? WHERE id = ?', [
    JSON.stringify(sizeList),
    stockNum,
    req.params.id,
  ]);
  res.json({ success: true, sizes: sizeList, stock: stockNum });
});

// ── ORDERS ────────────────────────────────────────────────────────────────────
router.get('/razorpay/key', (req, res) => {
  const cfg = getRazorpayConfig();
  if (!cfg) return res.status(503).json({ success: false, message: 'Online payments are not configured' });
  res.json({ success: true, key_id: cfg.key_id });
});

router.post('/orders', authenticateUser, async (req, res) => {
  const { user_name, user_email, user_phone, address, items, notes } = req.body;
  if (!user_name || !user_phone || !address || !items)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  if (req.user.role === 'admin') {
    return res.status(403).json({ success: false, message: 'Sign in with a customer account to place orders' });
  }

  const dbUser = await get('SELECT id FROM users WHERE id = ?', [req.user.id]);
  if (!dbUser) {
    return res.status(401).json({ success: false, message: 'Account not found. Please sign in again.' });
  }

  const deliveryZone = normalizeDeliveryZone(req.body.delivery_zone);
  if (!deliveryZone) {
    return res.status(400).json({
      success: false,
      message: 'Please select whether delivery is in Hyderabad & around or outside Hyderabad.',
    });
  }
  const deliveryFee = await getDeliveryFee('shop', deliveryZone);

  let orderItems;
  let subtotal;
  try {
    ({ items: orderItems, total: subtotal } = await resolveOrderItems(items));
  } catch (err) {
    return res.status(err.status || 400).json({ success: false, message: err.message });
  }

  const total = subtotal + deliveryFee;
  const id = uuidv4();
  const user_id = dbUser.id;

  const rzp = getRazorpayClient();
  if (!rzp) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured' });
  }

  await run(
    `INSERT INTO orders (
      id,user_id,user_name,user_email,user_phone,address,delivery_zone,delivery_fee,items,total,
      status,payment_method,payment_status,notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, user_id, user_name, user_email || null, user_phone, address,
      deliveryZone, deliveryFee, JSON.stringify(orderItems), total,
      'pending_payment', 'razorpay', 'pending', notes || null,
    ]
  );

  let rzpOrder;
  try {
    rzpOrder = await rzp.orders.create({
      amount: toPaise(total),
      currency: 'INR',
      receipt: id.slice(0, 32),
      notes: {
        order_id: id,
        user_id,
        delivery_zone: deliveryZone,
        delivery_fee: String(deliveryFee),
      },
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
    delivery: {
      zone: deliveryZone,
      zone_label: DELIVERY_ZONE_LABELS[deliveryZone],
      fee: deliveryFee,
      subtotal,
      total,
    },
    razorpay: {
      key_id: cfg.key_id,
      order_id: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
    },
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

  try {
    const paidItems = JSON.parse(order.items || '[]');
    await decrementStockForOrder(paidItems);
  } catch (err) {
    console.error('[shop] stock decrement after payment failed:', err);
  }

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
    const { page, limit, offset } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 50 });
    const where = [];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countRow = await get(`SELECT COUNT(*) AS total FROM orders ${whereSql}`, params);
    const total = Number(countRow?.total) || 0;

    const rows = await all(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    const orders = await Promise.all(
      rows.map(async (o) => ({
        ...o,
        items: await enrichOrderItems(JSON.parse(o.items ?? '[]'), get),
      }))
    );
    res.json({
      success: true,
      orders,
      pagination: paginationMeta({ page, limit, total }),
    });
  } catch (err) {
    console.error('[shop] GET /orders failed:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load orders' });
  }
});

router.patch('/orders/:id/status', authenticateAdmin, async (req, res) => {
  const { status, tracking_url } = req.body;
  const valid = ['received', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status' });

  const existing = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ success: false, message: 'Order not found' });

  let trackingUrl = existing.tracking_url || null;
  if (status === 'shipped') {
    const next = String(tracking_url ?? '').trim();
    if (!next) {
      return res.status(400).json({
        success: false,
        message: 'Tracking / shipping URL is required when marking an order as shipped.',
      });
    }
    try {
      // eslint-disable-next-line no-new
      new URL(next);
    } catch {
      return res.status(400).json({ success: false, message: 'Enter a valid tracking URL (https://…).' });
    }
    trackingUrl = next;
  } else if (tracking_url != null && String(tracking_url).trim()) {
    trackingUrl = String(tracking_url).trim();
  }

  await run(
    'UPDATE orders SET status=?, tracking_url=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
    [status, trackingUrl, req.params.id]
  );

  const updated = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (status === 'shipped' && existing.status !== 'shipped') {
    const { notifyOrderShipped } = require('../utils/notifyEmail');
    notifyOrderShipped(updated).catch((err) => {
      console.error('[shop] notifyOrderShipped failed:', err?.message || err);
    });
  }

  res.json({ success: true, order: updated });
});

module.exports = router;
