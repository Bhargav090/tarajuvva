const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { isDataUrl, isHttpUrl, parseDataUrl } = require('./imageDataUrl');
const { mediaStorageIsS3, uploadBuffer, uploadBufferAtKey, isS3Ref, s3Key } = require('./s3Storage');
const { normalizeRetainRef } = require('./persistImage');
const { toCardWebp, cardSiblingPath } = require('./imageVariants');

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

async function writeCardVariantForRef(originalRef, sourceBuffer) {
  if (!sourceBuffer?.length) return;
  try {
    const cardBuf = await toCardWebp(sourceBuffer);
    if (isS3Ref(originalRef)) {
      const key = s3Key(originalRef);
      const cardKey = cardSiblingPath(key);
      if (!cardKey) return;
      await uploadBufferAtKey(cardBuf, 'image/webp', cardKey);
      return;
    }
    if (typeof originalRef === 'string' && originalRef.startsWith('/uploads/products/')) {
      const cardRel = cardSiblingPath(originalRef);
      if (!cardRel) return;
      const abs = path.join(__dirname, '../..', cardRel.replace(/^\//, ''));
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, cardBuf);
    }
  } catch (e) {
    console.warn('[productImages] card variant failed:', e.message);
  }
}

function writeProductBufferToDisk(buffer, mimetype) {
  const ext = EXT_BY_MIME[String(mimetype || '').toLowerCase()] || '.jpg';
  const dir = getProductsUploadDir();
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${uuidv4()}${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);
  return `/uploads/products/${filename}`;
}

/** Save a multer file buffer; returns /uploads/... or s3://... */
async function saveProductImageFile(file) {
  if (!file?.buffer) return null;
  let ref;
  if (mediaStorageIsS3()) {
    ref = await uploadBuffer(file.buffer, file.mimetype || 'image/jpeg', 'products');
  } else {
    ref = writeProductBufferToDisk(file.buffer, file.mimetype);
  }
  await writeCardVariantForRef(ref, file.buffer);
  return ref;
}

/** Persist a base64 data URL; returns /uploads/... or s3://... */
async function saveDataUrlProductImage(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  let ref;
  if (mediaStorageIsS3()) {
    ref = await uploadBuffer(parsed.buffer, parsed.mime, 'products');
  } else {
    ref = writeProductBufferToDisk(parsed.buffer, parsed.mime);
  }
  await writeCardVariantForRef(ref, parsed.buffer);
  return ref;
}

async function normalizeRetainedImage(ref) {
  return normalizeRetainRef(ref, {
    dataSave: (dataUrl) => saveDataUrlProductImage(dataUrl),
  });
}

/**
 * Parse multipart product save: `data` JSON field + ordered `imageMeta` + binary `images` files.
 * imageMeta: [{ type: 'retain', value }, { type: 'file', index: 0 }, ...]
 */
async function resolveImagesFromRequest(req) {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  let data;
  try {
    data = JSON.parse(body.data || '{}');
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
      const kept = await normalizeRetainedImage(entry.value);
      if (kept) out.push(kept);
    } else if (entry?.type === 'file') {
      const idx = Number(entry.index);
      const file = Number.isFinite(idx) ? files[idx] : null;
      if (!file) {
        const err = new Error('One or more image uploads are missing. Please try again.');
        err.status = 400;
        throw err;
      }
      out.push(await saveProductImageFile(file));
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
  saveDataUrlProductImage,
  normalizeRetainedImage,
  resolveImagesFromRequest,
  writeCardVariantForRef,
  // Kept for callers that still need the sync disk path helper
  isHttpUrl,
  isDataUrl,
};
