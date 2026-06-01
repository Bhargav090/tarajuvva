const DATA_URL_RE = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;
const LEGACY_SRC_RE = /^(https?:\/\/|\/uploads\/)/i;

function parseImages(raw) {
  try {
    const v = JSON.parse(raw ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Small URL safe to persist on the order row (not base64). */
function pickStorableImage(images) {
  for (const s of images) {
    const t = String(s || '').trim();
    if (LEGACY_SRC_RE.test(t)) return t;
  }
  return null;
}

/** Image suitable for API responses (URL or base64 from live product). */
function pickDisplayImage(images) {
  for (const s of images) {
    const t = String(s || '').trim();
    if (!t) continue;
    if (LEGACY_SRC_RE.test(t) || DATA_URL_RE.test(t)) return t;
  }
  return null;
}

async function enrichOrderItems(items, get) {
  return Promise.all(
    items.map(async (item) => {
      if (item.image) return item;
      const row = await get('SELECT images FROM products WHERE id = ?', [item.id]);
      if (!row) return item;
      const image = pickDisplayImage(parseImages(row.images));
      return image ? { ...item, image } : item;
    })
  );
}

module.exports = { parseImages, pickStorableImage, pickDisplayImage, enrichOrderItems };
