const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isDataUrl, isHttpUrl } = require('./imageDataUrl');

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function getProductsUploadDir() {
  return path.join(__dirname, '../../uploads/products');
}

/** Save a multer file buffer to disk; returns `/uploads/products/...` path. */
function saveProductImageFile(file) {
  const ext = EXT_BY_MIME[String(file.mimetype || '').toLowerCase()] || '.jpg';
  const dir = getProductsUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), file.buffer);
  return `/uploads/products/${filename}`;
}

function normalizeRetainedImage(ref) {
  const s = String(ref || '').trim();
  if (!s) return null;
  if (isDataUrl(s) || isHttpUrl(s) || s.startsWith('/uploads/')) return s;
  return null;
}

/**
 * Parse multipart product save: `data` JSON field + ordered `imageMeta` + binary `images` files.
 * imageMeta: [{ type: 'retain', value }, { type: 'file', index: 0 }, ...]
 */
function resolveImagesFromRequest(req) {
  let data;
  try {
    data = JSON.parse(req.body.data || '{}');
  } catch {
    const err = new Error('Invalid product data JSON');
    err.status = 400;
    throw err;
  }

  const meta = Array.isArray(data.imageMeta) ? data.imageMeta : [];
  const files = Array.isArray(req.files) ? req.files : [];
  const out = [];

  for (const entry of meta) {
    if (entry?.type === 'retain') {
      const kept = normalizeRetainedImage(entry.value);
      if (kept) out.push(kept);
    } else if (entry?.type === 'file') {
      const idx = Number(entry.index);
      const file = Number.isFinite(idx) ? files[idx] : null;
      if (!file) {
        const err = new Error('One or more image uploads are missing. Please try again.');
        err.status = 400;
        throw err;
      }
      out.push(saveProductImageFile(file));
    }
  }

  if (out.length === 0) {
    const err = new Error('At least one product image is required');
    err.status = 400;
    throw err;
  }

  return { data, images: out };
}

module.exports = {
  saveProductImageFile,
  normalizeRetainedImage,
  resolveImagesFromRequest,
};
