const { DATA_URL_RE } = require('../lib/imageDataUrl');
const { isS3Ref } = require('./s3Storage');
const { publicImageUrl } = require('./publicImageUrl');
const LEGACY_SRC_RE = /^(https?:\/\/|\/uploads\/|s3:\/\/)/i;

function parseImages(raw) {
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Small reference safe to persist on the order row (URL only — not full base64). */
function pickStorableImage(images) {
  for (const s of images) {
    const t = String(s || '').trim();
    if (!t) continue;
    // Persist CDN URL for s3 refs so order emails/history stay viewable without resolver.
    if (isS3Ref(t)) {
      const url = publicImageUrl(t);
      if (url) return url;
      continue;
    }
    if (LEGACY_SRC_RE.test(t)) return t;
  }
  return null;
}

/** Image suitable for API responses (URL or base64 from live product). */
function pickDisplayImage(images) {
  for (const s of images) {
    const t = String(s || '').trim();
    if (!t) continue;
    if (isS3Ref(t)) {
      const url = publicImageUrl(t);
      if (url) return url;
      continue;
    }
    if (LEGACY_SRC_RE.test(t) || DATA_URL_RE.test(t)) return t;
  }
  return null;
}

/** Resolve a single order-item image ref for API responses. */
function resolveItemImage(raw) {
  const t = String(raw || '').trim();
  if (!t) return null;
  if (isS3Ref(t)) return publicImageUrl(t) || null;
  return t;
}

async function enrichOrderItems(items, get) {
  return Promise.all(
    (Array.isArray(items) ? items : []).map(async (item) => {
      const resolved = resolveItemImage(item.image);
      if (resolved) return { ...item, image: resolved };

      const productId = item.id ?? item.product_id;
      if (!productId) {
        // Drop unusable s3:// (or empty) so clients don't render broken thumbs
        return item.image != null ? { ...item, image: null } : item;
      }
      const row = await get('SELECT images FROM products WHERE id = ?', [productId]);
      if (!row) return item.image != null ? { ...item, image: null } : item;
      const image = pickDisplayImage(parseImages(row.images));
      return { ...item, image: image || null };
    })
  );
}

module.exports = {
  parseImages,
  pickStorableImage,
  pickDisplayImage,
  resolveItemImage,
  enrichOrderItems,
};
