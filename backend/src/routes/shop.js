const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { get, all, run } = require('../db/database');
const { authenticateAdmin, authenticateUser } = require('../middleware/auth');
const { parseImages, pickStorableImage, enrichOrderItems } = require('../lib/orderItems');
const { parsePagination, paginationMeta } = require('../lib/pagination');
const { resolveImagesFromRequest, saveDataUrlProductImage } = require('../lib/productImages');
const { mapImageList } = require('../lib/publicImageUrl');
const { isS3Ref, s3RefFromPublicUrl } = require('../lib/s3Storage');
const { notifyOrder } = require('../utils/notifyEmail');
const { getRazorpayConfig, getRazorpayClient, verifyPaymentSignature, toPaise } = require('../utils/razorpay');
const { getAllSizeCharts, getSizeChart, chartKeyForProduct } = require('../utils/sizeCharts');
const { normalizeDeliveryZone, getDeliveryFee, DELIVERY_ZONE_LABELS } = require('../utils/delivery');
const {
  computePromotions,
  reserveRedemptions,
  markRedemptionsApplied,
  releaseRedemptions,
  deleteRedemptionsForOrder,
  listAvailableGiftCards,
} = require('../lib/promotions');

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
async function resolveProductSave(req) {
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
const LEGACY_SRC_RE = /^(https?:\/\/|\/uploads\/|s3:\/\/)/i;

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

    const product = await get(
      'SELECT id, name, price, images, stock, sizes, size_type, garment_type, custom_sizing FROM products WHERE id = ?',
      [id]
    );
    if (!product) {
      const err = new Error(`Product not found: ${id}`);
      err.status = 404;
      throw err;
    }

    const sizeLabel = line.size ? String(line.size).trim() : '';
    const sizes = parseJsonArray(product.sizes);
    const customEnabled = product.custom_sizing == null ? true : Boolean(Number(product.custom_sizing));
    const isCustom = isCustomSizeLabel(sizeLabel);
    let customMeasurements = null;

    if (isCustom) {
      if (!customEnabled) {
        const err = new Error(`Custom sizing is not available for ${product.name}`);
        err.status = 400;
        throw err;
      }
      customMeasurements = await resolveCustomMeasurements(product, line.custom_measurements);
      const stockNum = Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
      if (stockNum < qty) {
        const err = new Error(
          stockNum <= 0 ? `${product.name} is out of stock` : `Only ${stockNum} left for ${product.name}`
        );
        err.status = 400;
        throw err;
      }
    } else if (sizes.length > 0) {
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
    if (sizeLabel) orderLine.size = isCustom ? 'Custom' : sizeLabel;
    if (customMeasurements) orderLine.custom_measurements = customMeasurements;
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
    if (isCustomSizeLabel(line.size)) {
      // Custom / made-to-measure: decrement overall stock only.
      const prev = Math.max(0, parseInt(String(product.stock ?? 0), 10) || 0);
      await run('UPDATE products SET stock = ? WHERE id = ?', [Math.max(0, prev - qty), product.id]);
      continue;
    }
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
 * New uploads: `/uploads/products/...` or `s3://...`. Legacy rows may still have https URLs.
 * Base64 data URLs are converted to disk/S3 so the DB stays small.
 * CDN URLs are collapsed back to s3:// keys when possible.
 */
async function normalizeProductImages(images) {
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
    const fromCdn = s3RefFromPublicUrl(s);
    if (fromCdn) {
      out.push(fromCdn);
      continue;
    }
    if (DATA_URL_RE.test(s)) {
      const saved = await saveDataUrlProductImage(s);
      if (!saved) {
        const err = new Error('Could not process one or more uploaded images');
        err.status = 400;
        throw err;
      }
      out.push(saved);
    } else if (LEGACY_SRC_RE.test(s) || isS3Ref(s)) {
      out.push(isS3Ref(s) ? `s3://${s.replace(/^s3:\/\/*/i, '')}` : s);
    } else {
      const err = new Error(
        'Each image must be a valid upload, base64 data URL, or legacy http(s) / /uploads/ / s3:// URL'
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

const MAX_SIMILAR_PRODUCTS = 8;

/** Normalize admin-curated similar product IDs (ordered, unique, no self). */
function normalizeSimilarProductIds(raw, selfId = null) {
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === 'string'
      ? parseJsonArray(raw)
      : [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const id = String(item || '').trim();
    if (!id || id === selfId || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_SIMILAR_PRODUCTS) break;
  }
  return out;
}

async function filterExistingProductIds(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(`SELECT id FROM products WHERE id IN (${placeholders})`, ids);
  const existing = new Set((rows || []).map((r) => String(r.id)));
  return ids.filter((id) => existing.has(id));
}

async function hydrateRecommendedProducts(ids) {
  if (!ids.length) return [];
  const placeholders = ids.map(() => '?').join(',');
  const rows = await all(`SELECT * FROM products WHERE id IN (${placeholders})`, ids);
  const byId = new Map((rows || []).map((r) => [String(r.id), parseProduct(r)]));
  return ids.map((id) => byId.get(id)).filter(Boolean);
}

const parseProduct = (p) => ({
  ...p,
  images: mapImageList(parseJsonArray(p.images)),
  ways_to_wear: parseJsonArray(p.ways_to_wear),
  tags: parseJsonArray(p.tags),
  sizes: parseJsonArray(p.sizes),
  similar_product_ids: normalizeSimilarProductIds(p.similar_product_ids),
  size_type: p.size_type || null,
  garment_type: p.garment_type || null,
  image_tag: (p.image_tag && String(p.image_tag).trim()) || null,
  details_and_care: (p.details_and_care && String(p.details_and_care).trim()) || null,
  // Default on when column missing / null (legacy rows before ALTER).
  custom_sizing: p.custom_sizing == null ? true : Boolean(Number(p.custom_sizing)),
});

function isCustomSizeLabel(label) {
  return String(label || '').trim().toLowerCase() === 'custom';
}

/** Normalize custom measurement payload against the product's size-chart columns. */
async function resolveCustomMeasurements(product, rawMeasurements) {
  const chartKey = chartKeyForProduct(product.size_type, product.garment_type);
  if (!chartKey) {
    const err = new Error(`Custom sizing needs a size chart for ${product.name}`);
    err.status = 400;
    throw err;
  }
  const chart = await getSizeChart(chartKey);
  const columns = Array.isArray(chart?.columns) ? chart.columns : [];
  if (!columns.length) {
    const err = new Error(`No measurements configured for ${product.name}`);
    err.status = 400;
    throw err;
  }
  const raw = (() => {
    if (Array.isArray(rawMeasurements)) {
      return rawMeasurements.reduce((acc, m) => {
        if (m && m.key != null) acc[String(m.key)] = m.value;
        return acc;
      }, {});
    }
    return rawMeasurements && typeof rawMeasurements === 'object' ? rawMeasurements : {};
  })();
  const list = [];
  for (const col of columns) {
    const key = String(col.key).trim();
    const label = String(col.label || key).trim();
    const value = raw[key] != null ? String(raw[key]).trim() : '';
    if (!value) {
      const err = new Error(`Please enter ${label} for ${product.name}`);
      err.status = 400;
      throw err;
    }
    list.push({ key, label, value });
  }
  return list;
}

/** Letter sizes: XS-XXXL, FREE, short codes, or ranges like S-M / M-L. */
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
        ? 'Invalid size label. Numeric sizes must be 1-2 digit numbers (e.g. 28, 32).'
        : 'Invalid size label. Use letter sizes (XS-XXXL) or ranges like S-M, M-L.'
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
  const recommended = await hydrateRecommendedProducts(product.similar_product_ids || []);
  res.json({ success: true, product, size_chart, recommended });
});

router.post('/products', maybeProductUpload, authenticateAdmin, async (req, res) => {
  let parsed;
  let imgList;
  try {
    ({ data: parsed, images: imgList } = await resolveProductSave(req));
    imgList = await normalizeProductImages(imgList);
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
  const detailsAndCare = parsed.details_and_care ? String(parsed.details_and_care).trim() || null : null;
  const customSizing = parsed.custom_sizing == null ? 1 : parsed.custom_sizing ? 1 : 0;
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
  const similarIds = await filterExistingProductIds(
    normalizeSimilarProductIds(parsed.similar_product_ids, id)
  );
  try {
    await run(
      `INSERT INTO products (id,name,price,original_price,category,description,ways_to_wear,details_and_care,images,tags,image_tag,stock,sizes,size_type,garment_type,featured,custom_sizing,similar_product_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        String(name).trim(),
        priceNum,
        original_price == null || original_price === '' ? null : Number(original_price),
        String(category).trim(),
        description ? String(description).trim() : null,
        JSON.stringify(ways),
        detailsAndCare,
        JSON.stringify(imgList),
        JSON.stringify(tagList),
        imageTag,
        stockNum,
        JSON.stringify(sizeList),
        sizeList.length ? sizeType : null,
        sizeList.length ? garmentType : null,
        featured ? 1 : 0,
        customSizing,
        JSON.stringify(similarIds),
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
    ({ data: parsed, images: imgList } = await resolveProductSave(req));
    imgList = await normalizeProductImages(imgList);
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
  const detailsAndCare = parsed.details_and_care ? String(parsed.details_and_care).trim() || null : null;
  const customSizing = parsed.custom_sizing == null ? 1 : parsed.custom_sizing ? 1 : 0;
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
  const similarIds = await filterExistingProductIds(
    normalizeSimilarProductIds(parsed.similar_product_ids, req.params.id)
  );
  try {
    await run(
      `UPDATE products SET name=?,price=?,original_price=?,category=?,description=?,ways_to_wear=?,details_and_care=?,images=?,tags=?,image_tag=?,stock=?,sizes=?,size_type=?,garment_type=?,featured=?,custom_sizing=?,similar_product_ids=? WHERE id=?`,
      [
        String(name).trim(),
        priceNum,
        original_price == null || original_price === '' ? null : Number(original_price),
        String(category).trim(),
        description ? String(description).trim() : null,
        JSON.stringify(ways),
        detailsAndCare,
        JSON.stringify(imgList),
        JSON.stringify(tagList),
        imageTag,
        stockNum,
        JSON.stringify(sizeList),
        sizeList.length ? sizeType : null,
        sizeList.length ? garmentType : null,
        featured ? 1 : 0,
        customSizing,
        JSON.stringify(similarIds),
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

/** Admin only - update size availability / stock without touching other fields. */
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

/** Customer account for promo checks — gift cards / user-specific coupons match the account email. */
async function loadCheckoutUser(req, res) {
  if (req.user.role === 'admin') {
    res.status(403).json({ success: false, message: 'Sign in with a customer account to place orders' });
    return null;
  }
  const dbUser = await get('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
  if (!dbUser) {
    res.status(401).json({ success: false, message: 'Account not found. Please sign in again.' });
    return null;
  }
  return dbUser;
}

router.get('/gift-cards/mine', authenticateUser, async (req, res) => {
  try {
    const dbUser = await loadCheckoutUser(req, res);
    if (!dbUser) return;
    res.json({ success: true, gift_cards: await listAvailableGiftCards(dbUser.email) });
  } catch (err) {
    console.error('[shop] GET /gift-cards/mine failed:', err);
    res.status(500).json({ success: false, message: 'Could not load gift cards' });
  }
});

router.post('/promotions/preview', authenticateUser, async (req, res) => {
  try {
    const dbUser = await loadCheckoutUser(req, res);
    if (!dbUser) return;
    let subtotal;
    try {
      ({ total: subtotal } = await resolveOrderItems(req.body.items));
    } catch (err) {
      return res.status(err.status || 400).json({ success: false, message: err.message });
    }
    const zone = normalizeDeliveryZone(req.body.delivery_zone);
    const deliveryFee = zone ? await getDeliveryFee('shop', zone) : 0;
    const summary = await computePromotions({
      userId: dbUser.id,
      userEmail: dbUser.email,
      subtotal,
      deliveryFee,
      couponCode: req.body.coupon_code,
      giftCardCode: req.body.gift_card_code,
      lenient: true,
    });
    const { errors, ...rest } = summary;
    res.json({ success: true, summary: rest, errors });
  } catch (err) {
    console.error('[shop] POST /promotions/preview failed:', err);
    res.status(500).json({ success: false, message: 'Could not apply discount. Please try again.' });
  }
});

router.post('/orders', authenticateUser, async (req, res) => {
  const { user_name, user_email, user_phone, address, items, notes } = req.body;
  if (!user_name || !user_phone || !address || !items)
    return res.status(400).json({ success: false, message: 'Missing required fields' });

  const dbUser = await loadCheckoutUser(req, res);
  if (!dbUser) return;

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

  let pricing;
  try {
    pricing = await computePromotions({
      userId: dbUser.id,
      userEmail: dbUser.email,
      subtotal,
      deliveryFee,
      couponCode: req.body.coupon_code,
      giftCardCode: req.body.gift_card_code,
    });
  } catch (err) {
    if (err.status && err.status < 500) {
      return res.status(err.status).json({ success: false, message: err.message });
    }
    console.error('[shop] promotion check failed:', err);
    return res.status(500).json({ success: false, message: 'Could not apply discount. Please try again.' });
  }

  const total = pricing.total;
  const id = uuidv4();
  const user_id = dbUser.id;
  const fullyCovered = total <= 0;

  const rzp = fullyCovered ? null : getRazorpayClient();
  if (!fullyCovered && !rzp) {
    return res.status(503).json({ success: false, message: 'Online payments are not configured' });
  }

  await run(
    `INSERT INTO orders (
      id,user_id,user_name,user_email,user_phone,address,delivery_zone,delivery_fee,subtotal,
      coupon_code,coupon_discount,gift_card_code,gift_card_discount,items,total,
      status,payment_method,payment_status,paid_at,notes
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,${fullyCovered ? 'CURRENT_TIMESTAMP' : 'NULL'},?)`,
    [
      id, user_id, user_name, user_email || null, user_phone, address,
      deliveryZone, deliveryFee, subtotal,
      pricing.coupon ? pricing.coupon.code : null, pricing.coupon_discount,
      pricing.gift_card ? pricing.gift_card.code : null, pricing.gift_card_discount,
      JSON.stringify(orderItems), total,
      fullyCovered ? 'received' : 'pending_payment',
      fullyCovered ? 'promo' : 'razorpay',
      fullyCovered ? 'paid' : 'pending',
      notes || null,
    ]
  );

  await reserveRedemptions({
    orderId: id,
    userId: user_id,
    userEmail: dbUser.email,
    breakdown: pricing,
    status: fullyCovered ? 'applied' : 'pending',
  });

  const delivery = {
    zone: deliveryZone,
    zone_label: DELIVERY_ZONE_LABELS[deliveryZone],
    fee: deliveryFee,
    subtotal,
    coupon_discount: pricing.coupon_discount,
    gift_card_discount: pricing.gift_card_discount,
    total,
  };

  if (fullyCovered) {
    try {
      await decrementStockForOrder(orderItems);
    } catch (err) {
      console.error('[shop] stock decrement for promo order failed:', err);
    }
    const paidRow = await get('SELECT * FROM orders WHERE id=?', [id]);
    notifyOrder(paidRow).catch(() => {});
    return res.status(201).json({
      success: true,
      paid: true,
      message: 'Order placed. Your coupon / gift card covered the full amount.',
      order: { ...paidRow, items: await enrichOrderItems(orderItems, get) },
      delivery,
    });
  }

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
    await deleteRedemptionsForOrder(id);
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
    delivery,
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
    await releaseRedemptions(req.params.id);
    return res.status(400).json({ success: false, message: 'Payment verification failed' });
  }

  await run(
    `UPDATE orders SET status = 'received', payment_status = 'paid', razorpay_order_id = ?, razorpay_payment_id = ?,
     paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [razorpay_order_id, razorpay_payment_id, req.params.id]
  );
  await markRedemptionsApplied(req.params.id);

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
    const where = ['deleted_at IS NULL'];
    const params = [];
    if (status) {
      where.push('status = ?');
      params.push(status);
    }
    const whereSql = `WHERE ${where.join(' AND ')}`;

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
